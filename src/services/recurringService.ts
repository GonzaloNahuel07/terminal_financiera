import { db } from '../db';
import type { RecurringObligation, RecurringFrequency, AmountPesos } from '../types';
import { validateIntegerAmount } from '../utils/money';
import { createTransaction } from './transactionService';
import { changeReserveStatus } from '../core/calculator';
import { DEFAULT_USER_ID } from './accountService';
import { scheduleBackgroundSync } from './syncService';

/**
 * Obtiene todas las plantillas de gastos recurrentes activas.
 */
export async function getActiveRecurringTemplates(): Promise<RecurringObligation[]> {
  const items = await db.recurringObligations.filter((r) => !r.isDeleted).toArray();
  return items.sort((a, b) => a.dueDay - b.dueDay);
}

/**
 * Crea una nueva plantilla de gasto periódico.
 */
export async function createRecurringTemplate(params: {
  name: string;
  expectedAmount: AmountPesos;
  frequency: RecurringFrequency;
  dueDay: number;
  priority: 1 | 2 | 3 | 4 | 5;
}): Promise<RecurringObligation> {
  const validatedAmount = validateIntegerAmount(params.expectedAmount);
  if (validatedAmount <= 0) {
    throw new Error('El importe debe ser mayor a 0 pesos.');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const template: RecurringObligation = {
    id,
    userId: DEFAULT_USER_ID,
    name: params.name.trim(),
    expectedAmount: validatedAmount,
    frequency: params.frequency,
    dueDay: Math.min(31, Math.max(1, Math.round(params.dueDay))),
    priority: params.priority,
    isActive: true,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  await db.recurringObligations.add(template);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'recurring_obligations',
    action: 'insert',
    payload: template as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return template;
}

/**
 * Modifica una plantilla de gasto recurrente.
 */
export async function updateRecurringTemplate(
  id: string,
  updates: Partial<Pick<RecurringObligation, 'name' | 'expectedAmount' | 'frequency' | 'dueDay' | 'priority' | 'isActive'>>
): Promise<RecurringObligation> {
  const existing = await db.recurringObligations.get(id);
  if (!existing) {
    throw new Error('La plantilla recurrente no existe.');
  }

  const now = new Date().toISOString();
  const updated: RecurringObligation = {
    ...existing,
    ...updates,
    updatedAt: now
  };

  await db.recurringObligations.put(updated);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'recurring_obligations',
    action: 'update',
    payload: updated as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();

  return updated;
}

/**
 * Baja lógica de una plantilla recurrente.
 */
export async function deleteRecurringTemplate(id: string): Promise<void> {
  const existing = await db.recurringObligations.get(id);
  if (!existing) return;

  const now = new Date().toISOString();
  await db.recurringObligations.update(id, {
    isDeleted: true,
    updatedAt: now
  });

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'recurring_obligations',
    action: 'delete',
    payload: { id, isDeleted: true },
    createdAt: now,
    syncStatus: 'pending'
  });

  scheduleBackgroundSync();
}

/**
 * Registra el pago confirmado de un gasto recurrente:
 * 1. Genera la transacción de egreso en la cuenta elegida.
 * 2. Si existía una reserva virtual asociada para esta obligación, se marca como applied.
 */
export async function payRecurringObligation(params: {
  recurringId: string;
  accountId: string;
  amount: AmountPesos;
  date: string;
  notes?: string;
}): Promise<void> {
  const rec = await db.recurringObligations.get(params.recurringId);
  if (!rec || rec.isDeleted) {
    throw new Error('La obligación periódica no fue encontrada.');
  }

  const validatedAmount = validateIntegerAmount(params.amount);

  // 1. Crear transacción de gasto
  await createTransaction({
    type: 'expense',
    amount: validatedAmount,
    date: params.date,
    accountId: params.accountId,
    category: 'Gasto Fijo',
    description: `Pago: ${rec.name}`,
    notes: params.notes?.trim() || `Pago periódico de ${rec.name}`,
    recurringId: rec.id
  });

  // 2. Liberar/aplicar reserva virtual asociada si existe
  const matchingReserve = await db.virtualReserves
    .filter((r) => r.status === 'active' && r.targetId === rec.id)
    .first();

  if (matchingReserve) {
    const applied = changeReserveStatus(matchingReserve, 'applied');
    await db.virtualReserves.put(applied);
  }
}
