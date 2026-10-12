import { db } from '../db';
import type { WeeklyPlan, Debt, RecurringObligation, AmountPesos } from '../types';
import { validateIntegerAmount } from '../utils/money';
import { DEFAULT_USER_ID } from './accountService';
import { analyzeWeeklyPlan, type WeeklyAnalysis } from '../core/weeklyPlan';
import { scheduleBackgroundSync } from './syncService';

/**
 * Obtiene el rango de fechas (YYYY-MM-DD) del lunes y domingo de la semana actual.
 */
export function getCurrentWeekRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const d = new Date(referenceDate);
  const day = d.getDay();
  // En JS, Sunday = 0, Monday = 1... Saturday = 6
  // Queremos que la semana inicie en Lunes
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = monday.toISOString().split('T')[0];
  const end = sunday.toISOString().split('T')[0];

  return { start, end };
}

/**
 * Calcula las obligaciones que caen en el rango de fechas especificado.
 * Incluye deudas con vencimiento en la semana y gastos recurrentes correspondientes.
 */
export async function calculateWeeklyObligations(
  startDate: string,
  endDate: string
): Promise<(RecurringObligation | Debt)[]> {
  const debts = await db.debts
    .filter((d) => !d.isDeleted && d.status !== 'paid' && d.dueDate >= startDate && d.dueDate <= endDate)
    .toArray();

  // Para obligaciones recurrentes, verificar si el dueDay cae en los días del mes comprendidos en el rango
  const startDay = parseInt(startDate.slice(8), 10);
  const endDay = parseInt(endDate.slice(8), 10);
  const sameMonth = startDate.slice(5, 7) === endDate.slice(5, 7);

  const recurring = await db.recurringObligations
    .filter((r) => !r.isDeleted && r.isActive)
    .toArray();

  const matchingRecurring = recurring.filter((r) => {
    if (r.frequency === 'weekly') return true;
    if (r.frequency === 'biweekly') return true; // Para quincenal consideramos una cuota
    // Mensual: verificar si su dueDay cae dentro de los días de la semana
    if (sameMonth) {
      return r.dueDay >= startDay && r.dueDay <= endDay;
    }
    // Si la semana cruza fin de mes (ej. 28 al 04)
    return r.dueDay >= startDay || r.dueDay <= endDay;
  });

  return [...debts, ...matchingRecurring];
}

/**
 * Obtiene el plan semanal activo actual.
 */
export async function getActiveWeeklyPlan(): Promise<WeeklyPlan | undefined> {
  return await db.weeklyPlans
    .filter((p) => p.status === 'active')
    .first();
}

/**
 * Obtiene o crea automáticamente el plan para la semana en curso.
 */
export async function getOrCreateCurrentWeeklyPlan(defaultExpectedIncome = 0): Promise<WeeklyPlan> {
  const { start, end } = getCurrentWeekRange();

  // 1. Buscar si ya existe un plan para esta semana
  const existing = await db.weeklyPlans
    .filter((p) => p.weekStartDate === start && p.weekEndDate === end)
    .first();

  if (existing) {
    // Sincronizar el ingreso real cobrado a la fecha
    return await syncWeeklyPlanActualIncome(existing.id);
  }

  // 2. Si no existe, crear uno nuevo
  return await createWeeklyPlan({
    weekStartDate: start,
    weekEndDate: end,
    expectedIncome: defaultExpectedIncome,
    notes: 'Plan creado automáticamente para la semana en curso'
  });
}

/**
 * Crea un nuevo plan semanal.
 */
export async function createWeeklyPlan(params: {
  weekStartDate: string;
  weekEndDate: string;
  expectedIncome: AmountPesos;
  notes?: string;
}): Promise<WeeklyPlan> {
  const validatedExpected = validateIntegerAmount(params.expectedIncome);
  if (validatedExpected < 0) {
    throw new Error('El ingreso proyectado no puede ser negativo.');
  }

  if (params.weekStartDate > params.weekEndDate) {
    throw new Error('La fecha de inicio de semana no puede ser posterior a la fecha de fin.');
  }

  // Calcular obligaciones del período
  const obligations = await calculateWeeklyObligations(params.weekStartDate, params.weekEndDate);
  const totalObligations = obligations.reduce((acc, ob) => {
    if ('expectedAmount' in ob) return acc + ob.expectedAmount;
    return acc + (ob.minimumPayment && ob.minimumPayment > 0 ? ob.minimumPayment : ob.remainingAmount);
  }, 0);

  // Calcular ingresos cobrados en ese rango
  const incomeTxs = await db.transactions
    .filter((tx) => !tx.isDeleted && tx.type === 'income' && tx.date >= params.weekStartDate && tx.date <= params.weekEndDate)
    .toArray();
  const actualIncome = incomeTxs.reduce((acc, tx) => acc + tx.amount, 0);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const plan: WeeklyPlan = {
    id,
    userId: DEFAULT_USER_ID,
    weekStartDate: params.weekStartDate,
    weekEndDate: params.weekEndDate,
    expectedIncome: validatedExpected,
    actualIncome,
    totalObligations,
    notes: params.notes?.trim() || undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };

  await db.weeklyPlans.add(plan);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'weekly_plans',
    action: 'insert',
    payload: plan as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return plan;
}

/**
 * Modifica la estimación u observaciones de un plan semanal.
 */
export async function updateWeeklyPlan(
  id: string,
  updates: Partial<Pick<WeeklyPlan, 'expectedIncome' | 'notes'>>
): Promise<WeeklyPlan> {
  const existing = await db.weeklyPlans.get(id);
  if (!existing) {
    throw new Error('El plan semanal no existe.');
  }

  const validatedExpected =
    updates.expectedIncome !== undefined
      ? validateIntegerAmount(updates.expectedIncome)
      : existing.expectedIncome;

  const now = new Date().toISOString();
  const updated: WeeklyPlan = {
    ...existing,
    expectedIncome: validatedExpected,
    notes: updates.notes !== undefined ? updates.notes.trim() || undefined : existing.notes,
    updatedAt: now
  };

  await db.weeklyPlans.put(updated);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'weekly_plans',
    action: 'update',
    payload: updated as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return updated;
}

/**
 * Sincroniza los ingresos cobrados reales de la semana sumando las transacciones de ingreso del rango.
 */
export async function syncWeeklyPlanActualIncome(planId: string): Promise<WeeklyPlan> {
  const plan = await db.weeklyPlans.get(planId);
  if (!plan) {
    throw new Error('El plan semanal no existe.');
  }

  const incomeTxs = await db.transactions
    .filter((tx) => !tx.isDeleted && tx.type === 'income' && tx.date >= plan.weekStartDate && tx.date <= plan.weekEndDate)
    .toArray();

  const actualIncome = incomeTxs.reduce((acc, tx) => acc + tx.amount, 0);

  // Recalcular obligaciones vigentes
  const obligations = await calculateWeeklyObligations(plan.weekStartDate, plan.weekEndDate);
  const totalObligations = obligations.reduce((acc, ob) => {
    if ('expectedAmount' in ob) return acc + ob.expectedAmount;
    return acc + (ob.minimumPayment && ob.minimumPayment > 0 ? ob.minimumPayment : ob.remainingAmount);
  }, 0);

  const now = new Date().toISOString();
  const updated: WeeklyPlan = {
    ...plan,
    actualIncome,
    totalObligations,
    updatedAt: now
  };

  await db.weeklyPlans.put(updated);

  return updated;
}

/**
 * Cierra formalmente un plan semanal, calculando el desvío final y guardando el balance de cierre.
 */
export async function closeWeeklyPlan(planId: string, closingNotes?: string): Promise<WeeklyPlan> {
  const plan = await db.weeklyPlans.get(planId);
  if (!plan) {
    throw new Error('El plan semanal no existe.');
  }

  // Sincronizar números finales
  const synced = await syncWeeklyPlanActualIncome(planId);
  const now = new Date().toISOString();

  const closed: WeeklyPlan = {
    ...synced,
    status: 'closed',
    notes: closingNotes ? closingNotes.trim() : synced.notes,
    updatedAt: now
  };

  await db.weeklyPlans.put(closed);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'weekly_plans',
    action: 'update',
    payload: closed as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return closed;
}

/**
 * Obtiene el historial completo de planes semanales ordenados cronológicamente descendente.
 */
export async function getWeeklyPlanHistory(): Promise<WeeklyPlan[]> {
  const plans = await db.weeklyPlans.toArray();
  return plans.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
}

/**
 * Ejecuta el análisis profundo del plan semanal activo utilizando el motor de dominio.
 */
export async function getDetailedWeeklyAnalysis(planId: string): Promise<{
  plan: WeeklyPlan;
  analysis: WeeklyAnalysis;
  obligations: (RecurringObligation | Debt)[];
}> {
  const plan = await syncWeeklyPlanActualIncome(planId);
  const obligations = await calculateWeeklyObligations(plan.weekStartDate, plan.weekEndDate);

  const analysis = analyzeWeeklyPlan({
    plan,
    actualCollectedIncome: plan.actualIncome,
    obligationsForWeek: obligations
  });

  return { plan, analysis, obligations };
}
