import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { createAccount } from './accountService';
import { registerDailyIncome } from './incomeService';
import { createDebt } from './debtService';
import { createRecurringTemplate } from './recurringService';
import {
  getCurrentWeekRange,
  getOrCreateCurrentWeeklyPlan,
  createWeeklyPlan,
  updateWeeklyPlan,
  syncWeeklyPlanActualIncome,
  closeWeeklyPlan,
  getDetailedWeeklyAnalysis
} from './weeklyPlanService';

describe('Servicio de Planificación y Cierre Semanal (weeklyPlanService)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.debts.clear();
    await db.recurringObligations.clear();
    await db.virtualReserves.clear();
    await db.weeklyPlans.clear();
    await db.syncOutbox.clear();
  });

  it('calcula correctamente el rango de lunes a domingo de una semana de referencia', () => {
    // Miércoles 14 de Octubre de 2026
    const wednesday = new Date('2026-10-14T12:00:00Z');
    const range = getCurrentWeekRange(wednesday);

    expect(range.start).toBe('2026-10-12'); // Lunes
    expect(range.end).toBe('2026-10-18'); // Domingo
  });

  it('crea o recupera el plan de la semana en curso y calcula obligaciones comprendidas', async () => {
    const { start, end } = getCurrentWeekRange();

    // Crear una deuda que venza dentro del rango de la semana
    await createDebt({
      name: 'Cuota Préstamo',
      creditor: 'Banco',
      totalAmount: 45000,
      dueDate: start, // Vence el lunes
      consequenceType: 'punitive_interest'
    });

    const plan = await getOrCreateCurrentWeeklyPlan(80000);
    expect(plan.weekStartDate).toBe(start);
    expect(plan.weekEndDate).toBe(end);
    expect(plan.expectedIncome).toBe(80000);
    expect(plan.totalObligations).toBe(45000);
    expect(plan.status).toBe('active');

    // Segunda llamada debe retornar el mismo plan
    const samePlan = await getOrCreateCurrentWeeklyPlan(100000);
    expect(samePlan.id).toBe(plan.id);
  });

  it('sincroniza los ingresos cobrados reales conforme se registran transacciones', async () => {
    const account = await createAccount({
      name: 'Mercado Pago',
      type: 'wallet',
      initialBalance: 0
    });

    const { start, end } = getCurrentWeekRange();

    const plan = await createWeeklyPlan({
      weekStartDate: start,
      weekEndDate: end,
      expectedIncome: 120000
    });

    expect(plan.actualIncome).toBe(0);

    // Registrar cobros en fechas dentro de la semana
    await registerDailyIncome({
      accountId: account.id,
      amount: 50000,
      origin: 'Cliente A',
      date: start
    });

    await registerDailyIncome({
      accountId: account.id,
      amount: 30000,
      origin: 'Cliente B',
      date: end
    });

    const synced = await syncWeeklyPlanActualIncome(plan.id);
    expect(synced.actualIncome).toBe(80000);
  });

  it('permite actualizar el ingreso proyectado y valida montos no negativos', async () => {
    const { start, end } = getCurrentWeekRange();
    const plan = await createWeeklyPlan({
      weekStartDate: start,
      weekEndDate: end,
      expectedIncome: 50000
    });

    const updated = await updateWeeklyPlan(plan.id, {
      expectedIncome: 75000,
      notes: 'Ajuste por nuevo cliente confirmado'
    });

    expect(updated.expectedIncome).toBe(75000);
    expect(updated.notes).toBe('Ajuste por nuevo cliente confirmado');

    await expect(
      updateWeeklyPlan(plan.id, { expectedIncome: -100 })
    ).rejects.toThrow();
  });

  it('cierra formalmente un plan semanal y registra la mutación en outbox', async () => {
    const { start, end } = getCurrentWeekRange();
    const plan = await createWeeklyPlan({
      weekStartDate: start,
      weekEndDate: end,
      expectedIncome: 100000
    });

    const closed = await closeWeeklyPlan(plan.id, 'Semana cerrada con superávit asignado a reservas');
    expect(closed.status).toBe('closed');
    expect(closed.notes).toContain('Semana cerrada con superávit');

    const outboxItem = await db.syncOutbox
      .filter((s) => s.entityName === 'weekly_plans' && s.action === 'update')
      .first();
    expect(outboxItem).toBeDefined();
  });

  it('genera un análisis detallado alertando faltantes y sugiriendo gastos postergables', async () => {
    const { start, end } = getCurrentWeekRange();

    // Crear obligación recurrente de ocio (prioridad 4)
    await createRecurringTemplate({
      name: 'Suscripción Streaming',
      expectedAmount: 15000,
      frequency: 'weekly',
      dueDay: 15,
      priority: 4
    });

    const plan = await createWeeklyPlan({
      weekStartDate: start,
      weekEndDate: end,
      expectedIncome: 50000 // Proyectado $50.000 pero cobrado $0
    });

    const { analysis } = await getDetailedWeeklyAnalysis(plan.id);
    expect(analysis.isDeficit).toBe(true);
    expect(analysis.uncoveredObligationsAmount).toBe(15000);
    expect(analysis.postponableExpenses.length).toBeGreaterThan(0);
    expect(analysis.postponableExpenses[0].name).toBe('Suscripción Streaming');
  });
});
