import type {
  WeeklyPlan,
  RecurringObligation,
  Debt,
  AmountPesos
} from '../types';
import { sumPesos } from '../utils/money';

export interface WeeklyAnalysis {
  expectedIncome: AmountPesos;
  actualIncome: AmountPesos;
  incomeDifference: AmountPesos; // actual - expected (negativo = faltante)
  isDeficit: boolean;
  totalObligationsDue: AmountPesos;
  uncoveredObligationsAmount: AmountPesos;
  postponableExpenses: {
    name: string;
    amount: AmountPesos;
    reason: string;
  }[];
  recommendations: string[];
}

/**
 * Analiza el estado del plan semanal comparando ingresos reales vs esperados,
 * identificando faltantes y sugiriendo recortes/postergaciones en gastos no esenciales.
 *
 * REGLA FUNDAMENTAL: Los ingresos esperados nunca se presentan como dinero disponible real.
 * Solo el dinero efectivamente cobrado financia las obligaciones.
 */
export function analyzeWeeklyPlan(params: {
  plan: WeeklyPlan;
  actualCollectedIncome: AmountPesos;
  obligationsForWeek: (RecurringObligation | Debt)[];
}): WeeklyAnalysis {
  const { plan, actualCollectedIncome, obligationsForWeek } = params;

  const expectedIncome = plan.expectedIncome;
  const actualIncome = actualCollectedIncome;
  const incomeDifference = actualIncome - expectedIncome;
  const isDeficit = incomeDifference < 0;

  // Total de obligaciones a cubrir esta semana
  const totalObligationsDue = sumPesos(
    ...obligationsForWeek.map((ob) => {
      if ('expectedAmount' in ob) return ob.expectedAmount;
      return ob.minimumPayment && ob.minimumPayment > 0 ? ob.minimumPayment : ob.remainingAmount;
    })
  );

  // Faltante real para cubrir las obligaciones con el dinero cobrado
  const uncoveredObligationsAmount = Math.max(0, totalObligationsDue - actualIncome);

  // Identificar obligaciones no esenciales que podrían postergarse o recortarse si hay faltante
  const postponableExpenses: WeeklyAnalysis['postponableExpenses'] = [];
  const recommendations: string[] = [];

  for (const ob of obligationsForWeek) {
    if ('priority' in ob) {
      // Es RecurringObligation
      if (ob.priority >= 4) {
        postponableExpenses.push({
          name: ob.name,
          amount: ob.expectedAmount,
          reason: `Gasto prescindible o de ocio (Prioridad ${ob.priority}/5). Se sugiere pausar temporalmente.`
        });
      } else if (ob.priority === 3 && uncoveredObligationsAmount > 0) {
        postponableExpenses.push({
          name: ob.name,
          amount: ob.expectedAmount,
          reason: `Gasto secundario (Prioridad ${ob.priority}/5). Puede postergarse hasta el próximo cobro.`
        });
      }
    } else {
      // Es Debt
      if (ob.consequenceType === 'none' || ob.consequenceType === 'mild') {
        postponableExpenses.push({
          name: ob.name,
          amount: ob.remainingAmount,
          reason: `Deuda sin recargos inmediatos ni consecuencias severas. Permite reprogramación si es indispensable.`
        });
      }
    }
  }

  // Generar recomendaciones explicativas
  if (isDeficit) {
    recommendations.push(
      `Los ingresos cobrados ($${actualIncome.toLocaleString('es-AR')}) están $${Math.abs(incomeDifference).toLocaleString('es-AR')} por debajo de lo proyectado.`
    );
  }

  if (uncoveredObligationsAmount > 0) {
    recommendations.push(
      `Faltan $${uncoveredObligationsAmount.toLocaleString('es-AR')} para financiar todas las obligaciones de la semana. Se activó la reorganización de prioridades.`
    );
    if (postponableExpenses.length > 0) {
      const sumPostponable = sumPesos(...postponableExpenses.map((p) => p.amount));
      recommendations.push(
        `Se identificaron gastos no esenciales por $${sumPostponable.toLocaleString('es-AR')} que pueden postergarse para proteger obligaciones críticas.`
      );
    }
  } else {
    recommendations.push(
      'Los ingresos reales cobrados cubren la totalidad de las obligaciones de la semana. El excedente puede asignarse a ahorro o fondo de contingencia.'
    );
  }

  return {
    expectedIncome,
    actualIncome,
    incomeDifference,
    isDeficit,
    totalObligationsDue,
    uncoveredObligationsAmount,
    postponableExpenses,
    recommendations
  };
}
