import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import {
  createAccount,
  getActiveAccounts,
  initializeDefaultAccountsIfNeeded,
  deleteAccount
} from './accountService';
import {
  createTransaction,
  getActiveTransactions,
  voidTransaction,
  updateTransaction
} from './transactionService';

describe('Servicios de Cuentas y Transacciones (Dexie / Offline-First)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.syncOutbox.clear();
  });

  it('inicializa las 3 cuentas por defecto si la base está vacía', async () => {
    const accounts = await initializeDefaultAccountsIfNeeded();
    expect(accounts.length).toBe(3);
    const names = accounts.map((a) => a.name);
    expect(names).toContain('Efectivo');
    expect(names).toContain('Cuenta Bancaria');
  });

  it('permite crear una nueva cuenta y persiste en IndexedDB y outbox', async () => {
    const acc = await createAccount({
      name: 'Ualá Billetera',
      type: 'wallet',
      initialBalance: 25000
    });

    expect(acc.name).toBe('Ualá Billetera');
    expect(acc.currentBalance).toBe(25000);

    const saved = await db.accounts.get(acc.id);
    expect(saved?.initialBalance).toBe(25000);

    const outboxItems = await db.syncOutbox.filter((s) => s.entityName === 'accounts').toArray();
    expect(outboxItems.length).toBeGreaterThan(0);
  });

  it('registra un ingreso y actualiza el saldo de la cuenta automáticamente', async () => {
    const acc = await createAccount({
      name: 'Banco Galicia',
      type: 'bank',
      initialBalance: 10000
    });

    const tx = await createTransaction({
      type: 'income',
      amount: 40000,
      date: '2026-10-11',
      accountId: acc.id,
      category: 'Sueldo',
      description: 'Cobro de sueldo'
    });

    expect(tx.amount).toBe(40000);

    const updatedAcc = await db.accounts.get(acc.id);
    expect(updatedAcc?.currentBalance).toBe(50000); // 10.000 + 40.000
  });

  it('registra una transferencia interna y actualiza ambos saldos', async () => {
    const origen = await createAccount({
      name: 'Mercado Pago',
      type: 'wallet',
      initialBalance: 50000
    });

    const destino = await createAccount({
      name: 'Efectivo en Mano',
      type: 'cash',
      initialBalance: 5000
    });

    await createTransaction({
      type: 'transfer',
      amount: 20000,
      date: '2026-10-11',
      accountId: origen.id,
      destinationAccountId: destino.id,
      category: 'Transferencia Interna',
      description: 'Retiro para efectivo'
    });

    const origenActualizado = await db.accounts.get(origen.id);
    const destinoActualizado = await db.accounts.get(destino.id);

    expect(origenActualizado?.currentBalance).toBe(30000); // 50.000 - 20.000
    expect(destinoActualizado?.currentBalance).toBe(25000); // 5.000 + 20.000
  });

  it('anula una transacción (soft delete) y restaura los saldos con registro auditable', async () => {
    const acc = await createAccount({
      name: 'Efectivo',
      type: 'cash',
      initialBalance: 15000
    });

    const tx = await createTransaction({
      type: 'expense',
      amount: 5000,
      date: '2026-10-11',
      accountId: acc.id,
      category: 'Kiosco',
      description: 'Gasto inicial'
    });

    // Test updateTransaction
    await updateTransaction(tx.id, {
      description: 'Gasto modificado'
    });
    const txMod = await db.transactions.get(tx.id);
    expect(txMod?.description).toBe('Gasto modificado');

    // Test getActiveTransactions
    const activeTxList = await getActiveTransactions();
    expect(activeTxList.length).toBe(1);

    let cuentaDB = await db.accounts.get(acc.id);
    expect(cuentaDB?.currentBalance).toBe(10000);

    // Anular transacción
    await voidTransaction(tx.id);

    cuentaDB = await db.accounts.get(acc.id);
    expect(cuentaDB?.currentBalance).toBe(15000); // Saldo restaurado

    const txDB = await db.transactions.get(tx.id);
    expect(txDB?.isDeleted).toBe(true); // Historial preservado
  });

  it('permite dar de baja una cuenta lógicamente (deleteAccount)', async () => {
    const acc = await createAccount({
      name: 'Cuenta Temporal',
      type: 'wallet'
    });

    let activeAccounts = await getActiveAccounts();
    expect(activeAccounts.some((a) => a.id === acc.id)).toBe(true);

    await deleteAccount(acc.id);

    activeAccounts = await getActiveAccounts();
    expect(activeAccounts.some((a) => a.id === acc.id)).toBe(false);
  });
});
