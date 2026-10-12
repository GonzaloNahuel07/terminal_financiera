import { db } from '../db';
import type { Transaction, TransactionType, AmountPesos } from '../types';
import { validateIntegerAmount } from '../utils/money';
import { calculateAccountBalance } from '../core/calculator';
import { DEFAULT_USER_ID } from './accountService';
import { scheduleBackgroundSync } from './syncService';

/**
 * Obtiene transacciones no eliminadas ordenadas por fecha descendente.
 */
export async function getActiveTransactions(accountId?: string): Promise<Transaction[]> {
  let query = db.transactions.filter((tx) => !tx.isDeleted);
  if (accountId) {
    query = query.filter(
      (tx) => tx.accountId === accountId || tx.destinationAccountId === accountId
    );
  }
  const items = await query.toArray();
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Recalcula y actualiza en Dexie el currentBalance de una cuenta.
 */
export async function syncAccountCurrentBalance(accountId: string): Promise<void> {
  const account = await db.accounts.get(accountId);
  if (!account) return;

  const allTx = await db.transactions
    .filter((tx) => !tx.isDeleted && (tx.accountId === accountId || tx.destinationAccountId === accountId))
    .toArray();

  const balance = calculateAccountBalance(account, allTx);
  await db.accounts.update(accountId, {
    currentBalance: balance,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Registra una nueva transacción financiera.
 */
export async function createTransaction(params: {
  type: TransactionType;
  amount: AmountPesos;
  date: string;
  accountId: string;
  destinationAccountId?: string;
  category: string;
  description: string;
  notes?: string;
  debtId?: string;
  recurringId?: string;
}): Promise<Transaction> {
  const validatedAmount = validateIntegerAmount(params.amount);
  if (validatedAmount <= 0) {
    throw new Error('El importe debe ser mayor a 0 pesos.');
  }

  if (params.type === 'transfer') {
    if (!params.destinationAccountId) {
      throw new Error('Debe seleccionar la cuenta de destino para una transferencia.');
    }
    if (params.accountId === params.destinationAccountId) {
      throw new Error('La cuenta de origen y de destino no pueden ser la misma.');
    }
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const clientMutationId = crypto.randomUUID();

  const transaction: Transaction = {
    id,
    userId: DEFAULT_USER_ID,
    clientMutationId,
    type: params.type,
    amount: validatedAmount,
    date: params.date,
    accountId: params.accountId,
    destinationAccountId: params.destinationAccountId,
    category: params.category.trim(),
    description: params.description.trim(),
    notes: params.notes?.trim(),
    debtId: params.debtId,
    recurringId: params.recurringId,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  await db.transactions.add(transaction);

  // Recalcular saldos de las cuentas involucradas
  await syncAccountCurrentBalance(params.accountId);
  if (params.destinationAccountId) {
    await syncAccountCurrentBalance(params.destinationAccountId);
  }

  // Registrar en outbox para sincronización
  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: clientMutationId,
    entityName: 'transactions',
    action: 'insert',
    payload: transaction as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return transaction;
}

/**
 * Modifica una transacción existente y recalcula los saldos.
 */
export async function updateTransaction(
  id: string,
  updates: Partial<Pick<Transaction, 'amount' | 'date' | 'category' | 'description' | 'notes' | 'accountId' | 'destinationAccountId'>>
): Promise<Transaction> {
  const existing = await db.transactions.get(id);
  if (!existing) {
    throw new Error('La transacción no existe.');
  }

  const oldAccountId = existing.accountId;
  const oldDestId = existing.destinationAccountId;

  const validatedAmount = updates.amount !== undefined ? validateIntegerAmount(updates.amount) : existing.amount;
  const now = new Date().toISOString();

  const updated: Transaction = {
    ...existing,
    ...updates,
    amount: validatedAmount,
    updatedAt: now
  };

  await db.transactions.put(updated);

  // Recalcular cuentas
  await syncAccountCurrentBalance(oldAccountId);
  if (oldDestId) await syncAccountCurrentBalance(oldDestId);
  if (updated.accountId !== oldAccountId) await syncAccountCurrentBalance(updated.accountId);
  if (updated.destinationAccountId && updated.destinationAccountId !== oldDestId) {
    await syncAccountCurrentBalance(updated.destinationAccountId);
  }

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'transactions',
    action: 'update',
    payload: updated as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return updated;
}

/**
 * Anula una transacción (baja lógica / soft-delete con preservación de auditoría).
 */
export async function voidTransaction(id: string): Promise<void> {
  const existing = await db.transactions.get(id);
  if (!existing || existing.isDeleted) return;

  const now = new Date().toISOString();
  const voided: Transaction = {
    ...existing,
    isDeleted: true,
    updatedAt: now
  };

  await db.transactions.put(voided);

  // Recalcular saldos al anular
  await syncAccountCurrentBalance(existing.accountId);
  if (existing.destinationAccountId) {
    await syncAccountCurrentBalance(existing.destinationAccountId);
  }

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'transactions',
    action: 'delete',
    payload: { id, isDeleted: true },
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();
}
