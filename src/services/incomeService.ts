import { db } from '../db';
import type {
  Transaction,
  VirtualReserve,
  AmountPesos
} from '../types';
import { createTransaction } from './transactionService';
import { prioritizeObligations, type PrioritizedItem } from '../core/debts';
import {
  calculateTotalRealBalance,
  calculateTotalActiveReserves,
  calculateFreeBalance,
  allocateVirtualReserve
} from '../core/calculator';
import { DEFAULT_USER_ID } from './accountService';
import { scheduleBackgroundSync } from './syncService';

export interface SuggestedAllocation {
  targetType: 'debt' | 'recurring_obligation' | 'savings_goal';
  targetId: string;
  name: string;
  suggestedAmount: AmountPesos;
  explanation: string;
  priorityLevel: PrioritizedItem['priorityLevel'];
}

export interface DailyIncomeResult {
  transaction: Transaction;
  suggestedAllocations: SuggestedAllocation[];
  freeBalanceAvailable: AmountPesos;
}

/**
 * Registra un cobro de ingreso diario variable y calcula de inmediato las sugerencias
 * de asignación para obligaciones prioritarias y fondo de ahorro.
 */
export async function registerDailyIncome(params: {
  amount: AmountPesos;
  accountId: string;
  origin: string; // Origen del ingreso (ej: "Venta del día", "Cobro freelance")
  date: string;
  notes?: string;
}): Promise<DailyIncomeResult> {
  // 1. Crear la transacción de ingreso
  const transaction = await createTransaction({
    type: 'income',
    amount: params.amount,
    date: params.date,
    accountId: params.accountId,
    category: params.origin.trim() || 'Ingreso Diario',
    description: `Ingreso: ${params.origin.trim() || 'Cobro del día'}`,
    notes: params.notes?.trim()
  });

  // 2. Cargar estado financiero actual
  const accounts = await db.accounts.filter((a) => !a.isDeleted && a.isActive).toArray();
  const transactions = await db.transactions.filter((tx) => !tx.isDeleted).toArray();
  const activeReserves = await db.virtualReserves.filter((r) => r.status === 'active').toArray();
  const debts = await db.debts.filter((d) => !d.isDeleted && d.status !== 'paid').toArray();
  const recurring = await db.recurringObligations.filter((r) => !r.isDeleted && r.isActive).toArray();
  const savingsGoals = await db.savingsGoals.filter((g) => !g.isDeleted && g.status === 'in_progress').toArray();

  const totalRealBalance = calculateTotalRealBalance(accounts, transactions);
  const totalReserved = calculateTotalActiveReserves(activeReserves);
  const freeBalance = calculateFreeBalance(totalRealBalance, totalReserved);

  // 3. Obtener obligaciones priorizadas
  const prioritized = prioritizeObligations({
    debts,
    recurring,
    savingsGoals,
    currentDate: params.date
  });

  // 4. Calcular sugerencias de reserva sin superar el dinero libre disponible
  let remainingToAllocate = freeBalance;
  const suggestedAllocations: SuggestedAllocation[] = [];

  for (const item of prioritized) {
    if (remainingToAllocate <= 0) break;

    // Verificar si ya tiene reserva previa
    const existingReserve = activeReserves.find((r) => r.targetId === item.id);
    const alreadyReserved = existingReserve ? existingReserve.amountReserved : 0;
    const pendingAmount = Math.max(0, item.amountRequired - alreadyReserved);

    if (pendingAmount <= 0) continue;

    // Asignar lo que se pueda según el saldo libre remanente
    const allocationAmount = Math.min(pendingAmount, remainingToAllocate);

    suggestedAllocations.push({
      targetType: item.type === 'emergency_fund' ? 'savings_goal' : item.type,
      targetId: item.id,
      name: item.name,
      suggestedAmount: allocationAmount,
      explanation: item.explanation,
      priorityLevel: item.priorityLevel
    });

    remainingToAllocate -= allocationAmount;
  }

  return {
    transaction,
    suggestedAllocations,
    freeBalanceAvailable: freeBalance
  };
}

/**
 * Aplica las reservas virtuales seleccionadas y confirmadas por el usuario.
 */
export async function applyConfirmedAllocations(
  allocations: { targetType: 'debt' | 'recurring_obligation' | 'savings_goal'; targetId: string; name: string; amount: AmountPesos }[]
): Promise<VirtualReserve[]> {
  const accounts = await db.accounts.filter((a) => !a.isDeleted && a.isActive).toArray();
  const transactions = await db.transactions.filter((tx) => !tx.isDeleted).toArray();
  const totalReal = calculateTotalRealBalance(accounts, transactions);

  const appliedReserves: VirtualReserve[] = [];

  for (const item of allocations) {
    if (item.amount <= 0) continue;

    const currentReservesInDb = await db.virtualReserves.toArray();
    const result = allocateVirtualReserve(
      DEFAULT_USER_ID,
      item.targetType,
      item.targetId,
      item.name,
      item.amount,
      currentReservesInDb,
      totalReal
    );

    if (result.success && result.reserve) {
      await db.virtualReserves.put(result.reserve);
      appliedReserves.push(result.reserve);

      await db.syncOutbox.add({
        id: crypto.randomUUID(),
        mutationId: crypto.randomUUID(),
        entityName: 'virtual_reserves',
        action: 'insert',
        payload: result.reserve as unknown as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      });
    }
  }

  if (appliedReserves.length > 0) {
    scheduleBackgroundSync();
  }

  return appliedReserves;
}
