import type {
  Debt,
  DebtStatus,
  RecurringObligation,
  SavingsGoal,
  AmountPesos
} from '../types';
import { validateIntegerAmount } from '../utils/money';

export interface PrioritizedItem {
  id: string;
  type: 'debt' | 'recurring_obligation' | 'emergency_fund';
  name: string;
  amountRequired: AmountPesos;
  dueDate?: string;
  score: number;
  priorityLevel: 'urgente' | 'alta' | 'media' | 'baja';
  explanation: string;
}

/**
 * Calcula la diferencia en días entre la fecha de vencimiento y una fecha base.
 * Valor negativo = Vencida hace X días.
 * 0 = Vence hoy.
 * Positivo = Vence en X días.
 */
export function getDaysUntilDue(dueDateStr: string, baseDateStr: string): number {
  const due = new Date(dueDateStr + 'T00:00:00');
  const base = new Date(baseDateStr + 'T00:00:00');
  const diffTime = due.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Actualiza el estado de una deuda en base a su saldo remanente y la fecha actual.
 */
export function evaluateDebtStatus(debt: Debt, currentDate: string): DebtStatus {
  if (debt.remainingAmount <= 0) {
    return 'paid';
  }

  const days = getDaysUntilDue(debt.dueDate, currentDate);
  if (days < 0) {
    return 'overdue';
  }

  if (debt.remainingAmount < debt.totalAmount) {
    return 'partial';
  }

  return 'pending';
}

/**
 * Aplica un pago confirmado a una deuda, actualizando su saldo pendiente y estado.
 */
export function applyDebtPayment(
  debt: Debt,
  paymentAmount: AmountPesos,
  currentDate: string
): { updatedDebt: Debt; actualPaid: AmountPesos } {
  const validatedAmount = validateIntegerAmount(paymentAmount);
  if (validatedAmount <= 0) {
    throw new Error('El importe del pago debe ser mayor a 0 pesos.');
  }

  // No permitir pagar más del saldo pendiente
  const actualPaid = Math.min(validatedAmount, debt.remainingAmount);
  const remaining = debt.remainingAmount - actualPaid;

  const now = new Date().toISOString();
  const updatedDebt: Debt = {
    ...debt,
    remainingAmount: remaining,
    status: remaining === 0 ? 'paid' : evaluateDebtStatus({ ...debt, remainingAmount: remaining }, currentDate),
    updatedAt: now
  };

  return { updatedDebt, actualPaid };
}

/**
 * Algoritmo del Asistente Financiero para ordenar y priorizar obligaciones.
 * Pondera:
 * 1. Severidad de consecuencias de impago (corte de servicio > intereses punitorios > legal > leve).
 * 2. Cercanía de la fecha de vencimiento (vencidas > próximas 1-3 días > 4-7 días).
 * 3. Obligaciones fijas vitales de la semana.
 * 4. Fondo de emergencia si está desprotegido.
 *
 * Cada recomendación cuenta con una explicación justificada y transparente en lenguaje natural.
 */
export function prioritizeObligations(params: {
  debts: Debt[];
  recurring: RecurringObligation[];
  savingsGoals: SavingsGoal[];
  currentDate: string; // YYYY-MM-DD
}): PrioritizedItem[] {
  const { debts, recurring, savingsGoals, currentDate } = params;
  const items: PrioritizedItem[] = [];

  // 1. Evaluar Deudas pendientes
  for (const debt of debts) {
    if (debt.isDeleted || debt.status === 'paid' || debt.remainingAmount <= 0) {
      continue;
    }

    const days = getDaysUntilDue(debt.dueDate, currentDate);
    let score = 0;
    const reasons: string[] = [];

    // Factor Consecuencia
    switch (debt.consequenceType) {
      case 'critical_cut':
        score += 120;
        reasons.push('Acarrea corte inminente de servicio básico');
        break;
      case 'punitive_interest':
        score += 90;
        reasons.push(
          debt.interestRateKnown
            ? `Genera intereses punitorios conocidos (${debt.interestRateKnown})`
            : 'Genera intereses punitorios por mora'
        );
        break;
      case 'legal':
        score += 70;
        reasons.push('Riesgo de reclamo extrajudicial/legal');
        break;
      case 'mild':
        score += 30;
        reasons.push('Consecuencia leve o reprogramable');
        break;
      case 'none':
        score += 10;
        reasons.push('Sin recargos inmediatos informados');
        break;
    }

    // Factor Temporal
    if (days < 0) {
      score += 150;
      reasons.unshift(`¡VENCIDA hace ${Math.abs(days)} día(s)!`);
    } else if (days === 0) {
      score += 110;
      reasons.unshift('VENCE HOY');
    } else if (days <= 3) {
      score += 80;
      reasons.unshift(`Vence en ${days} días`);
    } else if (days <= 7) {
      score += 50;
      reasons.unshift(`Vence esta semana (${days} días)`);
    } else {
      score += 15;
      reasons.unshift(`Vence en ${days} días`);
    }

    // Nivel de prioridad
    let priorityLevel: PrioritizedItem['priorityLevel'] = 'baja';
    if (score >= 180) priorityLevel = 'urgente';
    else if (score >= 120) priorityLevel = 'alta';
    else if (score >= 60) priorityLevel = 'media';

    items.push({
      id: debt.id,
      type: 'debt',
      name: debt.name,
      amountRequired: debt.minimumPayment && debt.minimumPayment > 0 ? debt.minimumPayment : debt.remainingAmount,
      dueDate: debt.dueDate,
      score,
      priorityLevel,
      explanation: reasons.join(' • ')
    });
  }

  // 2. Evaluar Gastos Recurrentes indispensables
  for (const rec of recurring) {
    if (rec.isDeleted || !rec.isActive) continue;

    // Calcular puntaje según prioridad (1 = indispensable/vital)
    let score = (6 - rec.priority) * 25; // prioridad 1 -> 125, prioridad 2 -> 100...
    let priorityLevel: PrioritizedItem['priorityLevel'] = 'media';

    if (rec.priority === 1) {
      score += 40;
      priorityLevel = 'alta';
    }

    items.push({
      id: rec.id,
      type: 'recurring_obligation',
      name: rec.name,
      amountRequired: rec.expectedAmount,
      score,
      priorityLevel,
      explanation: `Gasto recurrente indispensable (Prioridad fijada: ${rec.priority}/5) para mantener la estabilidad básica.`
    });
  }

  // 3. Evaluar Fondo de Emergencia
  const emergencyGoal = savingsGoals.find((g) => g.isEmergencyFund && !g.isDeleted && g.status === 'in_progress');
  if (emergencyGoal && emergencyGoal.currentAmount < emergencyGoal.targetAmount) {
    const deficit = emergencyGoal.targetAmount - emergencyGoal.currentAmount;
    const progressPct = (emergencyGoal.currentAmount / emergencyGoal.targetAmount) * 100;

    // Si tiene muy poco ahorro de contingencia (< 30%), se califica con prioridad alta
    const score = progressPct < 30 ? 95 : 50;

    items.push({
      id: emergencyGoal.id,
      type: 'emergency_fund',
      name: emergencyGoal.name,
      amountRequired: Math.min(deficit, 50000), // Aporte sugerido gradual
      score,
      priorityLevel: score >= 90 ? 'alta' : 'media',
      explanation: `Fondo de contingencia al ${Math.round(progressPct)}% de su meta. Vital para amortiguar imprevistos sin endeudarse.`
    });
  }

  // Ordenar de mayor a menor puntaje de urgencia
  return items.sort((a, b) => b.score - a.score);
}
