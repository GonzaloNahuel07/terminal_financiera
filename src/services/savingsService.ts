import { db } from '../db';
import type { SavingsGoal, AmountPesos } from '../types';
import { validateIntegerAmount } from '../utils/money';
import {
  calculateTotalRealBalance,
  calculateTotalActiveReserves,
  calculateFreeBalance
} from '../core/calculator';
import { allocateOrUpdateReserve } from './reserveService';
import { DEFAULT_USER_ID } from './accountService';

/**
 * Obtiene todas las metas de ahorro activas.
 */
export async function getActiveSavingsGoals(): Promise<SavingsGoal[]> {
  const items = await db.savingsGoals.filter((g) => !g.isDeleted).toArray();
  // El Fondo de Emergencia siempre primero, luego por prioridad
  return items.sort((a, b) => {
    if (a.isEmergencyFund && !b.isEmergencyFund) return -1;
    if (!a.isEmergencyFund && b.isEmergencyFund) return 1;
    return a.priority - b.priority;
  });
}

/**
 * Inicializa el Fondo de Emergencia como meta independiente por defecto si no existe.
 */
export async function initializeEmergencyFundIfNeeded(monthlyExpensesTarget = 150000): Promise<SavingsGoal> {
  const existing = await db.savingsGoals
    .filter((g) => !g.isDeleted && g.isEmergencyFund)
    .first();

  if (existing) return existing;

  const now = new Date().toISOString();
  const emergencyGoal: SavingsGoal = {
    id: crypto.randomUUID(),
    userId: DEFAULT_USER_ID,
    name: 'Fondo de Emergencia',
    targetAmount: validateIntegerAmount(monthlyExpensesTarget),
    currentAmount: 0,
    isEmergencyFund: true,
    priority: 1,
    status: 'in_progress',
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  await db.savingsGoals.add(emergencyGoal);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'savings_goals',
    action: 'insert',
    payload: emergencyGoal as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  return emergencyGoal;
}

/**
 * Crea una nueva meta de ahorro.
 */
export async function createSavingsGoal(params: {
  name: string;
  targetAmount: AmountPesos;
  targetDate?: string;
  isEmergencyFund?: boolean;
  priority?: 1 | 2 | 3 | 4 | 5;
}): Promise<SavingsGoal> {
  const validatedTarget = validateIntegerAmount(params.targetAmount);
  if (validatedTarget <= 0) {
    throw new Error('El monto objetivo debe ser mayor a 0 pesos.');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const goal: SavingsGoal = {
    id,
    userId: DEFAULT_USER_ID,
    name: params.name.trim(),
    targetAmount: validatedTarget,
    currentAmount: 0,
    targetDate: params.targetDate,
    isEmergencyFund: params.isEmergencyFund ?? false,
    priority: params.priority ?? (params.isEmergencyFund ? 1 : 3),
    status: 'in_progress',
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  await db.savingsGoals.add(goal);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'savings_goals',
    action: 'insert',
    payload: goal as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  return goal;
}

/**
 * Modifica datos de una meta de ahorro.
 */
export async function updateSavingsGoal(
  id: string,
  updates: Partial<Pick<SavingsGoal, 'name' | 'targetAmount' | 'targetDate' | 'priority' | 'status'>>
): Promise<SavingsGoal> {
  const existing = await db.savingsGoals.get(id);
  if (!existing) {
    throw new Error('La meta de ahorro no existe.');
  }

  const now = new Date().toISOString();
  const updated: SavingsGoal = {
    ...existing,
    ...updates,
    updatedAt: now
  };

  await db.savingsGoals.put(updated);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'savings_goals',
    action: 'update',
    payload: updated as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  return updated;
}

/**
 * Baja lógica de una meta de ahorro.
 */
export async function deleteSavingsGoal(id: string): Promise<void> {
  const existing = await db.savingsGoals.get(id);
  if (!existing) return;

  const now = new Date().toISOString();
  await db.savingsGoals.update(id, {
    isDeleted: true,
    updatedAt: now
  });

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'savings_goals',
    action: 'delete',
    payload: { id, isDeleted: true },
    createdAt: now,
    syncStatus: 'pending'
  });
}

/**
 * Aporta dinero a un objetivo desde el Saldo Libre.
 * Incrementa el acumulado y crea/actualiza la reserva virtual asociada para proteger los fondos.
 */
export async function contributeToSavingsGoal(params: {
  goalId: string;
  amount: AmountPesos;
}): Promise<SavingsGoal> {
  const goal = await db.savingsGoals.get(params.goalId);
  if (!goal || goal.isDeleted) {
    throw new Error('La meta de ahorro no fue encontrada.');
  }

  const validatedAmount = validateIntegerAmount(params.amount);
  if (validatedAmount <= 0) {
    throw new Error('El importe a aportar debe ser mayor a 0 pesos.');
  }

  // Verificar saldo libre disponible
  const accounts = await db.accounts.filter((a) => !a.isDeleted && a.isActive).toArray();
  const transactions = await db.transactions.filter((tx) => !tx.isDeleted).toArray();
  const activeReserves = await db.virtualReserves.filter((r) => r.status === 'active').toArray();

  const totalReal = calculateTotalRealBalance(accounts, transactions);
  const totalReserved = calculateTotalActiveReserves(activeReserves);
  const freeBalance = calculateFreeBalance(totalReal, totalReserved);

  if (validatedAmount > freeBalance) {
    throw new Error(`Saldo libre insuficiente ($${freeBalance.toLocaleString('es-AR')}) para este aporte.`);
  }

  const newCurrent = goal.currentAmount + validatedAmount;
  const isCompleted = newCurrent >= goal.targetAmount;
  const now = new Date().toISOString();

  const updated: SavingsGoal = {
    ...goal,
    currentAmount: newCurrent,
    status: isCompleted ? 'completed' : 'in_progress',
    updatedAt: now
  };

  await db.savingsGoals.put(updated);

  // Proteger el dinero en el centro de reservas
  await allocateOrUpdateReserve({
    targetType: 'savings_goal',
    targetId: goal.id,
    targetName: goal.name,
    amount: newCurrent
  });

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'savings_goals',
    action: 'update',
    payload: updated as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  return updated;
}

/**
 * Retira dinero de un objetivo hacia el Saldo Libre (en caso de emergencia o reasignación).
 */
export async function withdrawFromSavingsGoal(params: {
  goalId: string;
  amount: AmountPesos;
}): Promise<SavingsGoal> {
  const goal = await db.savingsGoals.get(params.goalId);
  if (!goal || goal.isDeleted) {
    throw new Error('La meta de ahorro no existe.');
  }

  const validatedAmount = validateIntegerAmount(params.amount);
  if (validatedAmount > goal.currentAmount) {
    throw new Error(`No podés retirar más de lo acumulado ($${goal.currentAmount.toLocaleString('es-AR')}).`);
  }

  const newCurrent = Math.max(0, goal.currentAmount - validatedAmount);
  const now = new Date().toISOString();

  const updated: SavingsGoal = {
    ...goal,
    currentAmount: newCurrent,
    status: newCurrent >= goal.targetAmount ? 'completed' : 'in_progress',
    updatedAt: now
  };

  await db.savingsGoals.put(updated);

  // Ajustar la reserva virtual asociada
  if (newCurrent > 0) {
    await allocateOrUpdateReserve({
      targetType: 'savings_goal',
      targetId: goal.id,
      targetName: goal.name,
      amount: newCurrent
    });
  } else {
    // Si quedó en 0, desafectar la reserva
    const matchingReserve = await db.virtualReserves
      .filter((r) => r.status === 'active' && r.targetId === goal.id)
      .first();
    if (matchingReserve) {
      await db.virtualReserves.update(matchingReserve.id, {
        status: 'released',
        updatedAt: now
      });
    }
  }

  return updated;
}
