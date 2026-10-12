import { db } from '../db';
import type { Debt, DebtConsequence, AmountPesos } from '../types';
import { validateIntegerAmount } from '../utils/money';
import { evaluateDebtStatus, applyDebtPayment } from '../core/debts';
import { createTransaction } from './transactionService';
import { changeReserveStatus } from '../core/calculator';
import { DEFAULT_USER_ID } from './accountService';
import { scheduleBackgroundSync } from './syncService';

/**
 * Obtiene todas las deudas activas no eliminadas.
 */
export async function getActiveDebts(): Promise<Debt[]> {
  const items = await db.debts.filter((d) => !d.isDeleted).toArray();
  const today = new Date().toISOString().split('T')[0];
  // Actualizar estados reactivos según fecha actual
  return items.map((d) => ({
    ...d,
    status: evaluateDebtStatus(d, today)
  })).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Registra una nueva deuda financiera.
 */
export async function createDebt(params: {
  name: string;
  creditor: string;
  totalAmount: AmountPesos;
  minimumPayment?: AmountPesos;
  dueDate: string;
  interestRateKnown?: string;
  consequenceType: DebtConsequence;
  notes?: string;
}): Promise<Debt> {
  const validatedTotal = validateIntegerAmount(params.totalAmount);
  if (validatedTotal <= 0) {
    throw new Error('El monto de la deuda debe ser mayor a 0 pesos.');
  }

  const validatedMin = params.minimumPayment ? validateIntegerAmount(params.minimumPayment) : undefined;
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const id = crypto.randomUUID();

  const newDebt: Debt = {
    id,
    userId: DEFAULT_USER_ID,
    name: params.name.trim(),
    creditor: params.creditor.trim(),
    totalAmount: validatedTotal,
    remainingAmount: validatedTotal,
    minimumPayment: validatedMin,
    dueDate: params.dueDate,
    interestRateKnown: params.interestRateKnown?.trim() || undefined,
    consequenceType: params.consequenceType,
    status: evaluateDebtStatus(
      {
        id,
        userId: DEFAULT_USER_ID,
        name: params.name,
        creditor: params.creditor,
        totalAmount: validatedTotal,
        remainingAmount: validatedTotal,
        dueDate: params.dueDate,
        consequenceType: params.consequenceType,
        status: 'pending',
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      },
      today
    ),
    notes: params.notes?.trim() || undefined,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  await db.debts.add(newDebt);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'debts',
    action: 'insert',
    payload: newDebt as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return newDebt;
}

/**
 * Modifica datos de una deuda existente.
 */
export async function updateDebt(
  id: string,
  updates: Partial<Pick<Debt, 'name' | 'creditor' | 'dueDate' | 'minimumPayment' | 'consequenceType' | 'interestRateKnown' | 'notes'>>
): Promise<Debt> {
  const existing = await db.debts.get(id);
  if (!existing) {
    throw new Error('La deuda no existe.');
  }

  const now = new Date().toISOString();
  const updated: Debt = {
    ...existing,
    ...updates,
    updatedAt: now
  };

  await db.debts.put(updated);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'debts',
    action: 'update',
    payload: updated as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return updated;
}

/**
 * Da de baja lógica una deuda.
 */
export async function deleteDebt(id: string): Promise<void> {
  const existing = await db.debts.get(id);
  if (!existing) return;

  const now = new Date().toISOString();
  await db.debts.update(id, {
    isDeleted: true,
    updatedAt: now
  });

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'debts',
    action: 'delete',
    payload: { id, isDeleted: true },
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();
}

/**
 * Registra y confirma un pago de deuda:
 * 1. Reduce el saldo pendiente de la deuda y actualiza su estado.
 * 2. Genera la transacción de débito en la cuenta elegida.
 * 3. Si existía una reserva virtual asociada, la desafecta o actualiza a applied.
 */
export async function recordDebtPayment(params: {
  debtId: string;
  accountId: string;
  paymentAmount: AmountPesos;
  date: string;
  notes?: string;
}): Promise<{ updatedDebt: Debt; paymentAmount: AmountPesos }> {
  const debt = await db.debts.get(params.debtId);
  if (!debt || debt.isDeleted) {
    throw new Error('La deuda no fue encontrada.');
  }

  const account = await db.accounts.get(params.accountId);
  if (!account || account.isDeleted) {
    throw new Error('La cuenta bancaria o billetera seleccionada no existe.');
  }

  // 1. Aplicar pago en el modelo de deuda
  const { updatedDebt, actualPaid } = applyDebtPayment(debt, params.paymentAmount, params.date);
  await db.debts.put(updatedDebt);

  // 2. Registrar transacción financiera de débito
  await createTransaction({
    type: 'debt_payment',
    amount: actualPaid,
    date: params.date,
    accountId: params.accountId,
    category: 'Pago de Deuda',
    description: `Pago: ${debt.name} (${debt.creditor})`,
    notes: params.notes?.trim() || `Cancelación de deuda ${updatedDebt.status === 'paid' ? 'total' : 'parcial'}`,
    debtId: debt.id
  });

  // 3. Desafectar reserva virtual asociada si existía
  const matchingReserve = await db.virtualReserves
    .filter((r) => r.status === 'active' && r.targetId === debt.id)
    .first();

  if (matchingReserve) {
    if (updatedDebt.remainingAmount <= 0) {
      // Deuda totalmente saldada -> reserva aplicada
      const applied = changeReserveStatus(matchingReserve, 'applied');
      await db.virtualReserves.put(applied);
    } else {
      // Deuda parcial -> ajustar reserva restante al saldo remanente
      const newReserved = Math.min(matchingReserve.amountReserved, updatedDebt.remainingAmount);
      await db.virtualReserves.update(matchingReserve.id, {
        amountReserved: newReserved,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Sincronizar en outbox
  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'debts',
    action: 'update',
    payload: updatedDebt as unknown as Record<string, unknown>,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return { updatedDebt, paymentAmount: actualPaid };
}
