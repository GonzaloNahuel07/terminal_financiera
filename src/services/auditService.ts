import { db } from '../db';
import type { AmountPesos } from '../types';
import { calculateTotalRealBalance, calculateTotalActiveReserves, calculateFreeBalance } from '../core/calculator';

export interface AuditCheckItem {
  id: string;
  category: 'liquidity' | 'reserves' | 'debts' | 'savings' | 'sync';
  title: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
  details?: string;
  autoFixable?: boolean;
}

export interface AuditReport {
  score: number; // 0 a 100
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  errorCount: number;
  timestamp: string;
  checks: AuditCheckItem[];
  storageEstimate?: {
    usageBytes: number;
    quotaBytes: number;
    usagePercent: number;
  };
  metrics: {
    totalRealBalance: AmountPesos;
    totalReserves: AmountPesos;
    freeBalance: AmountPesos;
    activeDebtsCount: number;
    activeSavingsCount: number;
    pendingSyncCount: number;
    totalRecords: number;
  };
}

/**
 * Ejecuta una auditoría integral del motor contable, invariantes financieras,
 * integridad referencial y almacenamiento local.
 */
export async function performFinancialAudit(): Promise<AuditReport> {
  const accounts = await db.accounts.filter((a) => !a.isDeleted).toArray();
  const transactions = await db.transactions.filter((tx) => !tx.isDeleted).toArray();
  const reserves = await db.virtualReserves.toArray();
  const debts = await db.debts.filter((d) => !d.isDeleted).toArray();
  const recurring = await db.recurringObligations.filter((r) => !r.isDeleted).toArray();
  const savingsGoals = await db.savingsGoals.filter((g) => !g.isDeleted).toArray();
  const outbox = await db.syncOutbox.toArray();
  const weeklyPlans = await db.weeklyPlans.toArray();

  const totalRecords =
    accounts.length +
    transactions.length +
    reserves.length +
    debts.length +
    recurring.length +
    savingsGoals.length +
    outbox.length +
    weeklyPlans.length;

  const checks: AuditCheckItem[] = [];

  // 1. Auditoría de Cuentas y Liquidez Real
  const totalRealBalance = calculateTotalRealBalance(accounts, transactions);
  const activeAccounts = accounts.filter((a) => a.isActive);

  if (activeAccounts.length === 0) {
    checks.push({
      id: 'accounts-presence',
      category: 'liquidity',
      title: 'Disponibilidad de Cuentas Activas',
      status: 'warning',
      message: 'No hay cuentas activas registradas para operar.',
      details: 'Creá al menos una cuenta (banco, efectivo o billetera) para registrar cobros.'
    });
  } else {
    checks.push({
      id: 'accounts-presence',
      category: 'liquidity',
      title: 'Cuentas Activas',
      status: 'pass',
      message: `${activeAccounts.length} cuenta(s) activa(s) registradas correctamente.`
    });
  }

  // Verificar si hay cuentas con saldo negativo
  const accountsWithNegativeBalance = activeAccounts.filter((acc) => {
    const accTx = transactions.filter((tx) => tx.accountId === acc.id);
    let bal = acc.initialBalance;
    for (const tx of accTx) {
      if (tx.type === 'income') bal += tx.amount;
      else if (tx.type === 'expense') bal -= tx.amount;
      else if (tx.type === 'transfer') {
        bal -= tx.amount;
        if (tx.destinationAccountId === acc.id) bal += tx.amount;
      }
    }
    return bal < 0;
  });

  if (accountsWithNegativeBalance.length > 0) {
    checks.push({
      id: 'accounts-overdraft',
      category: 'liquidity',
      title: 'Sobregiro en Cuentas',
      status: 'warning',
      message: `${accountsWithNegativeBalance.length} cuenta(s) presentan saldo contable negativo.`,
      details: `Cuentas: ${accountsWithNegativeBalance.map((a) => a.name).join(', ')}`
    });
  } else {
    checks.push({
      id: 'accounts-overdraft',
      category: 'liquidity',
      title: 'Consistencia de Saldos Bancarios',
      status: 'pass',
      message: 'Ninguna cuenta presenta saldos en descubierto no justificados.'
    });
  }

  // 2. Auditoría del Invariante de Reservas y Saldo Libre
  const activeReserves = reserves.filter((r) => r.status === 'active');
  const totalReserves = calculateTotalActiveReserves(activeReserves);
  const freeBalance = calculateFreeBalance(totalRealBalance, totalReserves);

  if (totalReserves > totalRealBalance) {
    checks.push({
      id: 'reserves-invariant',
      category: 'reserves',
      title: 'Invariante de Reservas vs Saldo Real',
      status: 'error',
      message: 'El dinero virtual reservado excede la liquidez real disponible.',
      details: `Reservado: $${totalReserves.toLocaleString('es-AR')} | Saldo Real: $${totalRealBalance.toLocaleString('es-AR')}. Déficit: $${(totalReserves - totalRealBalance).toLocaleString('es-AR')}.`,
      autoFixable: true
    });
  } else {
    checks.push({
      id: 'reserves-invariant',
      category: 'reserves',
      title: 'Invariante de Reservas',
      status: 'pass',
      message: 'El saldo libre es positivo y no viola la liquidez real.'
    });
  }

  // Verificar reservas huérfanas (cuyo target ya no existe o está completado)
  const orphanReserves = activeReserves.filter((r) => {
    if (r.targetType === 'debt') {
      const debt = debts.find((d) => d.id === r.targetId);
      return !debt || debt.status === 'paid';
    }
    if (r.targetType === 'recurring_obligation') {
      const rec = recurring.find((rec) => rec.id === r.targetId);
      return !rec || !rec.isActive;
    }
    if (r.targetType === 'savings_goal') {
      const goal = savingsGoals.find((g) => g.id === r.targetId);
      return !goal || goal.status === 'completed';
    }
    return false;
  });

  if (orphanReserves.length > 0) {
    checks.push({
      id: 'reserves-orphans',
      category: 'reserves',
      title: 'Reservas Huérfanas o Inactivas',
      status: 'warning',
      message: `Se detectaron ${orphanReserves.length} reserva(s) asignadas a obligaciones ya saldadas o eliminadas.`,
      details: `Reservas afectadas: ${orphanReserves.map((r) => r.targetName).join(', ')}`,
      autoFixable: true
    });
  } else {
    checks.push({
      id: 'reserves-orphans',
      category: 'reserves',
      title: 'Vínculos de Reservas Activas',
      status: 'pass',
      message: 'Todas las reservas están vinculadas a obligaciones legítimas pendientes.'
    });
  }

  // 3. Auditoría de Pasivos y Deudas
  const inconsistentDebts = debts.filter(
    (d) => (d.remainingAmount <= 0 && d.status !== 'paid') || d.remainingAmount > d.totalAmount
  );

  if (inconsistentDebts.length > 0) {
    checks.push({
      id: 'debts-status-sync',
      category: 'debts',
      title: 'Estados de Deuda vs Saldo Restante',
      status: 'warning',
      message: `${inconsistentDebts.length} deuda(s) tienen un estado incoherente con su saldo restante.`,
      details: inconsistentDebts.map((d) => `${d.name} (Restante: $${d.remainingAmount}, Estado: ${d.status})`).join('; '),
      autoFixable: true
    });
  } else {
    checks.push({
      id: 'debts-status-sync',
      category: 'debts',
      title: 'Consistencia de Deudas',
      status: 'pass',
      message: 'Todos los compromisos de deuda reflejan estados coherentes con sus saldos.'
    });
  }

  // 4. Auditoría de Ahorros y Fondo de Emergencia
  const emergencyGoal = savingsGoals.find((g) => g.isEmergencyFund);
  if (!emergencyGoal) {
    checks.push({
      id: 'savings-emergency-fund',
      category: 'savings',
      title: 'Fondo de Emergencia Configurado',
      status: 'warning',
      message: 'No tenés un objetivo designado como Fondo de Emergencia.',
      details: 'Tener una meta de emergencia es vital para no endeudarse ante imprevistos.'
    });
  } else {
    checks.push({
      id: 'savings-emergency-fund',
      category: 'savings',
      title: 'Fondo de Emergencia',
      status: 'pass',
      message: `Fondo configurado: ${Math.round((emergencyGoal.currentAmount / emergencyGoal.targetAmount) * 100)}% alcanzado.`
    });
  }

  // 5. Auditoría de Sincronización y Outbox
  const pendingSync = outbox.filter((o) => o.syncStatus === 'pending');
  const errorSync = outbox.filter((o) => o.syncStatus === 'failed');

  if (errorSync.length > 0) {
    checks.push({
      id: 'sync-errors',
      category: 'sync',
      title: 'Conflictos en Cola de Sincronización',
      status: 'error',
      message: `${errorSync.length} cambio(s) reportaron error al sincronizar con Supabase.`,
      details: errorSync.map((e) => `${e.entityName} (${e.action}): ${e.errorMessage || 'Desconocido'}`).join('; ')
    });
  } else if (pendingSync.length > 10) {
    checks.push({
      id: 'sync-pending-queue',
      category: 'sync',
      title: 'Cola de Mutaciones Offline Acumulada',
      status: 'warning',
      message: `${pendingSync.length} cambios pendientes de sincronizar con la nube.`
    });
  } else {
    checks.push({
      id: 'sync-status',
      category: 'sync',
      title: 'Salud de Sincronización Outbox',
      status: 'pass',
      message: 'Cola offline limpia y sincronizada sin errores pendientes.'
    });
  }

  // 6. Almacenamiento estimado del dispositivo
  let storageEstimate: AuditReport['storageEstimate'];
  if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const est = await navigator.storage.estimate();
      if (est.quota && est.usage) {
        storageEstimate = {
          usageBytes: est.usage,
          quotaBytes: est.quota,
          usagePercent: Math.min(100, Math.round((est.usage / est.quota) * 10000) / 100)
        };
      }
    } catch {
      // ignorar si el navegador no permite estimar cuota
    }
  }

  // Cálculo de puntaje de salud
  const passedCount = checks.filter((c) => c.status === 'pass').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const errorCount = checks.filter((c) => c.status === 'error').length;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (passedCount * 100 + warningCount * 65 - errorCount * 50) / checks.length
      )
    )
  );

  return {
    score,
    totalChecks: checks.length,
    passedCount,
    warningCount,
    errorCount,
    timestamp: new Date().toISOString(),
    checks,
    storageEstimate,
    metrics: {
      totalRealBalance,
      totalReserves,
      freeBalance,
      activeDebtsCount: debts.filter((d) => d.status !== 'paid').length,
      activeSavingsCount: savingsGoals.filter((g) => g.status === 'in_progress').length,
      pendingSyncCount: pendingSync.length,
      totalRecords
    }
  };
}

/**
 * Corrige de forma automática inconsistencias menores identificadas durante la auditoría.
 */
export async function autoRepairFinancialInconsistencies(): Promise<{
  repairedCount: number;
  actionsPerformed: string[];
}> {
  const actionsPerformed: string[] = [];
  let repairedCount = 0;

  // 1. Corregir deudas con saldo restante 0 no marcadas como 'paid'
  const paidDebtsToFix = await db.debts
    .filter((d) => !d.isDeleted && d.remainingAmount <= 0 && d.status !== 'paid')
    .toArray();

  for (const debt of paidDebtsToFix) {
    await db.debts.update(debt.id, {
      status: 'paid',
      remainingAmount: 0,
      updatedAt: new Date().toISOString()
    });
    actionsPerformed.push(`Deuda "${debt.name}" marcada como 'paid'.`);
    repairedCount++;
  }

  // 2. Liberar reservas huérfanas de objetivos saldados o eliminados
  const reserves = await db.virtualReserves.filter((r) => r.status === 'active').toArray();
  const debts = await db.debts.toArray();
  const recurring = await db.recurringObligations.toArray();
  const savings = await db.savingsGoals.toArray();

  for (const reserve of reserves) {
    let shouldArchive = false;
    if (reserve.targetType === 'debt') {
      const d = debts.find((item) => item.id === reserve.targetId);
      if (!d || d.isDeleted || d.status === 'paid') shouldArchive = true;
    } else if (reserve.targetType === 'recurring_obligation') {
      const rec = recurring.find((item) => item.id === reserve.targetId);
      if (!rec || rec.isDeleted || !rec.isActive) shouldArchive = true;
    } else if (reserve.targetType === 'savings_goal') {
      const g = savings.find((item) => item.id === reserve.targetId);
      if (!g || g.isDeleted || g.status === 'completed') shouldArchive = true;
    }

    if (shouldArchive) {
      await db.virtualReserves.update(reserve.id, {
        status: 'released',
        updatedAt: new Date().toISOString()
      });
      actionsPerformed.push(`Reserva huérfana "${reserve.targetName}" liberada.`);
      repairedCount++;
    }
  }

  return {
    repairedCount,
    actionsPerformed
  };
}
