import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { createAccount } from './accountService';
import { createDebt, recordDebtPayment, getActiveDebts } from './debtService';
import { createRecurringTemplate, payRecurringObligation, getActiveRecurringTemplates } from './recurringService';
import { allocateVirtualReserve } from '../core/calculator';

describe('Servicios de Deudas y Gastos Recurrentes (debtService y recurringService)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.debts.clear();
    await db.recurringObligations.clear();
    await db.virtualReserves.clear();
    await db.syncOutbox.clear();
  });

  it('crea una deuda con consecuencia de mora y calcula su estado inicial', async () => {
    const debt = await createDebt({
      name: 'Tarjeta Visa',
      creditor: 'Banco Santander',
      totalAmount: 90000,
      minimumPayment: 15000,
      dueDate: '2026-10-25',
      consequenceType: 'punitive_interest',
      interestRateKnown: '14% mensual'
    });

    expect(debt.name).toBe('Tarjeta Visa');
    expect(debt.remainingAmount).toBe(90000);
    expect(debt.consequenceType).toBe('punitive_interest');

    const allDebts = await getActiveDebts();
    expect(allDebts.length).toBe(1);
  });

  it('registra un pago parcial de deuda: debita cuenta bancaria y reduce el saldo remanente', async () => {
    // 1. Cuenta bancaria con $100.000
    const account = await createAccount({
      name: 'Banco Galicia',
      type: 'bank',
      initialBalance: 100000
    });

    // 2. Deuda de $50.000
    const debt = await createDebt({
      name: 'Préstamo',
      creditor: 'Banco',
      totalAmount: 50000,
      dueDate: '2026-10-30',
      consequenceType: 'mild'
    });

    // 3. Pagar cuota de $20.000
    const { updatedDebt } = await recordDebtPayment({
      debtId: debt.id,
      accountId: account.id,
      paymentAmount: 20000,
      date: '2026-10-11'
    });

    expect(updatedDebt.remainingAmount).toBe(30000);
    expect(updatedDebt.status).toBe('partial');

    // 4. Saldo de cuenta debita $20.000 -> $80.000
    const accDB = await db.accounts.get(account.id);
    expect(accDB?.currentBalance).toBe(80000);

    // 5. Verificar transacción de tipo debt_payment
    const tx = await db.transactions.filter((t) => t.debtId === debt.id).first();
    expect(tx?.type).toBe('debt_payment');
    expect(tx?.amount).toBe(20000);
  });

  it('cancela totalmente una deuda y desafecta la reserva virtual asociada a applied', async () => {
    const account = await createAccount({
      name: 'Efectivo',
      type: 'cash',
      initialBalance: 60000
    });

    const debt = await createDebt({
      name: 'Servicio Luz',
      creditor: 'Edenor',
      totalAmount: 30000,
      dueDate: '2026-10-12',
      consequenceType: 'critical_cut'
    });

    // Crear reserva virtual previa para esta deuda
    const reserveAlloc = allocateVirtualReserve(
      'local-user',
      'debt',
      debt.id,
      debt.name,
      30000,
      [],
      60000
    );
    await db.virtualReserves.put(reserveAlloc.reserve!);

    const reservaPrevia = await db.virtualReserves.get(reserveAlloc.reserve!.id);
    expect(reservaPrevia?.status).toBe('active');

    // Pago total de la deuda
    const { updatedDebt } = await recordDebtPayment({
      debtId: debt.id,
      accountId: account.id,
      paymentAmount: 30000,
      date: '2026-10-11'
    });

    expect(updatedDebt.status).toBe('paid');
    expect(updatedDebt.remainingAmount).toBe(0);

    // Comprobar que la reserva virtual pasó a 'applied'
    const reservaPosterior = await db.virtualReserves.get(reserveAlloc.reserve!.id);
    expect(reservaPosterior?.status).toBe('applied');
  });

  it('gestiona plantillas recurrentes y registra pagos periódicos', async () => {
    const account = await createAccount({
      name: 'Mercado Pago',
      type: 'wallet',
      initialBalance: 80000
    });

    const template = await createRecurringTemplate({
      name: 'Internet Fibertel',
      expectedAmount: 25000,
      frequency: 'monthly',
      dueDay: 15,
      priority: 2
    });

    expect(template.dueDay).toBe(15);
    const templates = await getActiveRecurringTemplates();
    expect(templates.length).toBe(1);

    // Pagar obligación recurrente
    await payRecurringObligation({
      recurringId: template.id,
      accountId: account.id,
      amount: 25000,
      date: '2026-10-11'
    });

    const accDB = await db.accounts.get(account.id);
    expect(accDB?.currentBalance).toBe(55000); // 80.000 - 25.000
  });
});
