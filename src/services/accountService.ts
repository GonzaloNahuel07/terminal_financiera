import { db } from '../db';
import type { Account, AccountType, AmountPesos } from '../types';
import { validateIntegerAmount } from '../utils/money';

export const DEFAULT_USER_ID = 'local-user';

/**
 * Obtiene todas las cuentas activas y no eliminadas.
 */
export async function getActiveAccounts(): Promise<Account[]> {
  return await db.accounts
    .filter((acc) => !acc.isDeleted && acc.isActive)
    .toArray();
}

/**
 * Inicializa cuentas por defecto si la base de datos está vacía.
 */
export async function initializeDefaultAccountsIfNeeded(): Promise<Account[]> {
  const existingCount = await db.accounts.count();
  if (existingCount > 0) {
    return await getActiveAccounts();
  }

  const now = new Date().toISOString();
  const defaultAccounts: Account[] = [
    {
      id: crypto.randomUUID(),
      userId: DEFAULT_USER_ID,
      name: 'Efectivo',
      type: 'cash',
      currency: 'ARS',
      initialBalance: 0,
      currentBalance: 0,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      userId: DEFAULT_USER_ID,
      name: 'Billetera Virtual (Mercado Pago)',
      type: 'wallet',
      currency: 'ARS',
      initialBalance: 0,
      currentBalance: 0,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      userId: DEFAULT_USER_ID,
      name: 'Cuenta Bancaria',
      type: 'bank',
      currency: 'ARS',
      initialBalance: 0,
      currentBalance: 0,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    }
  ];

  await db.accounts.bulkAdd(defaultAccounts);

  // Registrar en outbox para sincronización futura
  for (const acc of defaultAccounts) {
    await db.syncOutbox.add({
      id: crypto.randomUUID(),
      mutationId: crypto.randomUUID(),
      entityName: 'accounts',
      action: 'insert',
      payload: acc as unknown as Record<string, unknown>,
      createdAt: now,
      syncStatus: 'pending'
    });
  }

  return defaultAccounts;
}

/**
 * Crea una nueva cuenta financiera.
 */
export async function createAccount(params: {
  name: string;
  type: AccountType;
  initialBalance?: AmountPesos;
}): Promise<Account> {
  const validatedInitial = validateIntegerAmount(params.initialBalance ?? 0);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const account: Account = {
    id,
    userId: DEFAULT_USER_ID,
    name: params.name.trim(),
    type: params.type,
    currency: 'ARS',
    initialBalance: validatedInitial,
    currentBalance: validatedInitial,
    isActive: true,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  await db.accounts.add(account);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'accounts',
    action: 'insert',
    payload: account as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  return account;
}

/**
 * Edita datos de una cuenta existente.
 */
export async function updateAccount(
  id: string,
  updates: Partial<Pick<Account, 'name' | 'type' | 'isActive' | 'initialBalance'>>
): Promise<Account> {
  const existing = await db.accounts.get(id);
  if (!existing) {
    throw new Error('La cuenta no existe.');
  }

  const now = new Date().toISOString();
  const updated: Account = {
    ...existing,
    ...updates,
    updatedAt: now
  };

  await db.accounts.put(updated);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'accounts',
    action: 'update',
    payload: updated as unknown as Record<string, unknown>,
    createdAt: now,
    syncStatus: 'pending'
  });

  return updated;
}

/**
 * Baja lógica (soft delete) de una cuenta.
 */
export async function deleteAccount(id: string): Promise<void> {
  const existing = await db.accounts.get(id);
  if (!existing) return;

  const now = new Date().toISOString();
  const softDeleted: Account = {
    ...existing,
    isDeleted: true,
    updatedAt: now
  };

  await db.accounts.put(softDeleted);

  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    entityName: 'accounts',
    action: 'delete',
    payload: { id, isDeleted: true },
    createdAt: now,
    syncStatus: 'pending'
  });
}
