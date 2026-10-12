import { db } from '../db';
import type {
  VirtualReserve,
  ReserveTargetType,
  AmountPesos
} from '../types';
import {
  calculateTotalRealBalance,
  calculateTotalActiveReserves,
  calculateFreeBalance,
  allocateVirtualReserve,
  changeReserveStatus
} from '../core/calculator';
import { DEFAULT_USER_ID } from './accountService';
import { scheduleBackgroundSync } from './syncService';

export interface LiquidityMetrics {
  totalRealBalance: AmountPesos;
  totalReserves: AmountPesos;
  freeBalance: AmountPesos;
  uncoveredObligationsAmount: AmountPesos;
  availableForExtraSavings: AmountPesos;
  distribution: {
    debts: AmountPesos;
    recurring: AmountPesos;
    savings: AmountPesos;
  };
}

/**
 * Obtiene todas las reservas activas.
 */
export async function getActiveReserves(): Promise<VirtualReserve[]> {
  const items = await db.virtualReserves.filter((r) => r.status === 'active').toArray();
  return items.sort((a, b) => b.amountReserved - a.amountReserved);
}

/**
 * Asigna o actualiza el monto de una reserva virtual para una obligación u objetivo.
 * Valida la invariante de no superar el saldo libre disponible.
 */
export async function allocateOrUpdateReserve(params: {
  targetType: ReserveTargetType;
  targetId: string;
  targetName: string;
  amount: AmountPesos;
}): Promise<VirtualReserve> {
  const accounts = await db.accounts.filter((a) => !a.isDeleted && a.isActive).toArray();
  const transactions = await db.transactions.filter((tx) => !tx.isDeleted).toArray();
  const allReserves = await db.virtualReserves.toArray();

  const totalReal = calculateTotalRealBalance(accounts, transactions);

  const result = allocateVirtualReserve(
    DEFAULT_USER_ID,
    params.targetType,
    params.targetId,
    params.targetName,
    params.amount,
    allReserves,
    totalReal
  );

  if (!result.success || !result.reserve) {
    throw new Error(result.reason || 'No se pudo asignar la reserva virtual.');
  }

  await db.virtualReserves.put(result.reserve);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'virtual_reserves',
    action: 'insert',
    payload: result.reserve as unknown as Record<string, unknown>,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return result.reserve;
}

/**
 * Libera una reserva virtual. El dinero comprometido vuelve de inmediato
 * al Saldo Libre disponible para gastar.
 */
export async function releaseReserve(reserveId: string): Promise<VirtualReserve> {
  const existing = await db.virtualReserves.get(reserveId);
  if (!existing) {
    throw new Error('La reserva no existe.');
  }

  const updated = changeReserveStatus(existing, 'released');
  await db.virtualReserves.put(updated);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'virtual_reserves',
    action: 'update',
    payload: updated as unknown as Record<string, unknown>,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return updated;
}

/**
 * Calcula las 5 métricas clave de liquidez requeridas por el asistente:
 * 1. Saldo real.
 * 2. Reservas asignadas.
 * 3. Saldo libre para gastar.
 * 4. Obligaciones todavía sin financiar.
 * 5. Dinero disponible para ahorro adicional.
 */
export async function calculateLiquidityMetrics(): Promise<LiquidityMetrics> {
  const accounts = await db.accounts.filter((a) => !a.isDeleted && a.isActive).toArray();
  const transactions = await db.transactions.filter((tx) => !tx.isDeleted).toArray();
  const activeReserves = await db.virtualReserves.filter((r) => r.status === 'active').toArray();
  const debts = await db.debts.filter((d) => !d.isDeleted && d.status !== 'paid').toArray();
  const recurring = await db.recurringObligations.filter((r) => !r.isDeleted && r.isActive).toArray();

  const totalRealBalance = calculateTotalRealBalance(accounts, transactions);
  const totalReserves = calculateTotalActiveReserves(activeReserves);
  const freeBalance = calculateFreeBalance(totalRealBalance, totalReserves);

  // Calcular desglose de reservas por tipo
  let debtsReserved = 0;
  let recurringReserved = 0;
  let savingsReserved = 0;

  for (const r of activeReserves) {
    if (r.targetType === 'debt') debtsReserved += r.amountReserved;
    else if (r.targetType === 'recurring_obligation') recurringReserved += r.amountReserved;
    else if (r.targetType === 'savings_goal') savingsReserved += r.amountReserved;
  }

  // Calcular obligaciones pendientes aún sin financiar
  let totalPendingCommitments = 0;
  for (const d of debts) {
    const matching = activeReserves.find((r) => r.targetId === d.id);
    const reserved = matching ? matching.amountReserved : 0;
    totalPendingCommitments += Math.max(0, d.remainingAmount - reserved);
  }
  for (const rec of recurring) {
    const matching = activeReserves.find((r) => r.targetId === rec.id);
    const reserved = matching ? matching.amountReserved : 0;
    totalPendingCommitments += Math.max(0, rec.expectedAmount - reserved);
  }

  return {
    totalRealBalance,
    totalReserves,
    freeBalance,
    uncoveredObligationsAmount: totalPendingCommitments,
    availableForExtraSavings: freeBalance,
    distribution: {
      debts: debtsReserved,
      recurring: recurringReserved,
      savings: savingsReserved
    }
  };
}
