import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { createAccount } from './accountService';
import {
  initializeEmergencyFundIfNeeded,
  createSavingsGoal,
  contributeToSavingsGoal,
  withdrawFromSavingsGoal,
  deleteSavingsGoal,
  getActiveSavingsGoals
} from './savingsService';
import { calculateLiquidityMetrics } from './reserveService';

describe('Servicio de Metas de Ahorro y Fondo de Emergencia (savingsService)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.debts.clear();
    await db.recurringObligations.clear();
    await db.virtualReserves.clear();
    await db.savingsGoals.clear();
    await db.syncOutbox.clear();
  });

  it('inicializa el Fondo de Emergencia con prioridad 1 y evita duplicados en llamadas sucesivas', async () => {
    const fund1 = await initializeEmergencyFundIfNeeded(200000);
    expect(fund1.name).toBe('Fondo de Emergencia');
    expect(fund1.isEmergencyFund).toBe(true);
    expect(fund1.priority).toBe(1);
    expect(fund1.targetAmount).toBe(200000);
    expect(fund1.currentAmount).toBe(0);

    const fund2 = await initializeEmergencyFundIfNeeded(300000);
    expect(fund2.id).toBe(fund1.id);
    expect(fund2.targetAmount).toBe(200000); // Mantiene el existente

    const goals = await getActiveSavingsGoals();
    expect(goals.length).toBe(1);
  });

  it('crea una meta de ahorro personalizada con monto entero y valida que sea positivo', async () => {
    const goal = await createSavingsGoal({
      name: 'Cambio de Celular',
      targetAmount: 350000,
      targetDate: '2026-12-31',
      priority: 2
    });

    expect(goal.name).toBe('Cambio de Celular');
    expect(goal.targetAmount).toBe(350000);
    expect(goal.priority).toBe(2);
    expect(goal.currentAmount).toBe(0);
    expect(goal.status).toBe('in_progress');

    // Debe rechazar importes inválidos o negativos
    await expect(
      createSavingsGoal({
        name: 'Meta Inválida',
        targetAmount: 0
      })
    ).rejects.toThrow();
  });

  it('aporta dinero a una meta bloqueando el importe en reservas virtuales y verifica saldo libre', async () => {
    // 1. Cargar liquidez real de $100.000
    await createAccount({
      name: 'Banco Nación',
      type: 'bank',
      initialBalance: 100000
    });

    const goal = await createSavingsGoal({
      name: 'Vacaciones',
      targetAmount: 150000
    });

    // 2. Intentar aportar más del saldo libre debe fallar
    await expect(
      contributeToSavingsGoal({
        goalId: goal.id,
        amount: 120000
      })
    ).rejects.toThrow('Saldo libre insuficiente');

    // 3. Aporte válido de $40.000
    const updated = await contributeToSavingsGoal({
      goalId: goal.id,
      amount: 40000
    });

    expect(updated.currentAmount).toBe(40000);
    expect(updated.status).toBe('in_progress');

    // 4. Verificar que se creó automáticamente la reserva virtual
    const metrics = await calculateLiquidityMetrics();
    expect(metrics.totalRealBalance).toBe(100000);
    expect(metrics.totalReserves).toBe(40000);
    expect(metrics.freeBalance).toBe(60000);

    // 5. Completar la meta con $110.000 (requiere tener saldo libre)
    // Agregamos fondos a la cuenta
    await createAccount({
      name: 'Mercado Pago',
      type: 'wallet',
      initialBalance: 200000
    });

    const completed = await contributeToSavingsGoal({
      goalId: goal.id,
      amount: 110000
    });

    expect(completed.currentAmount).toBe(150000);
    expect(completed.status).toBe('completed');
  });

  it('permite retirar dinero de una meta y libera proporcionalmente la reserva virtual', async () => {
    await createAccount({
      name: 'Efectivo',
      type: 'cash',
      initialBalance: 100000
    });

    const goal = await createSavingsGoal({
      name: 'Fondo Reparaciones',
      targetAmount: 80000
    });

    // Aportar $50.000
    await contributeToSavingsGoal({
      goalId: goal.id,
      amount: 50000
    });

    let metrics = await calculateLiquidityMetrics();
    expect(metrics.freeBalance).toBe(50000);

    // Retiro excesivo debe fallar
    await expect(
      withdrawFromSavingsGoal({
        goalId: goal.id,
        amount: 60000
      })
    ).rejects.toThrow('No podés retirar más de lo acumulado');

    // Retiro parcial de $20.000
    const partial = await withdrawFromSavingsGoal({
      goalId: goal.id,
      amount: 20000
    });

    expect(partial.currentAmount).toBe(30000);
    metrics = await calculateLiquidityMetrics();
    expect(metrics.totalReserves).toBe(30000);
    expect(metrics.freeBalance).toBe(70000); // 100.000 - 30.000

    // Retiro total del remanente ($30.000)
    const zeroGoal = await withdrawFromSavingsGoal({
      goalId: goal.id,
      amount: 30000
    });

    expect(zeroGoal.currentAmount).toBe(0);
    metrics = await calculateLiquidityMetrics();
    expect(metrics.totalReserves).toBe(0);
    expect(metrics.freeBalance).toBe(100000); // 100% libre nuevamente
  });

  it('realiza baja lógica de una meta y registra la mutación en la bandeja de sincronización', async () => {
    const goal = await createSavingsGoal({
      name: 'Meta a borrar',
      targetAmount: 50000
    });

    await deleteSavingsGoal(goal.id);

    const active = await getActiveSavingsGoals();
    expect(active.some((g) => g.id === goal.id)).toBe(false);

    const syncItems = await db.syncOutbox.filter((s) => s.entityName === 'savings_goals' && s.action === 'delete').toArray();
    expect(syncItems.length).toBe(1);
  });
});
