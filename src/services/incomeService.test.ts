import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { createAccount } from './accountService';
import { registerDailyIncome, applyConfirmedAllocations } from './incomeService';
import type { Debt } from '../types';

describe('Servicio de Ingresos Diarios y Asignación Inteligente (incomeService)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.virtualReserves.clear();
    await db.debts.clear();
    await db.recurringObligations.clear();
    await db.savingsGoals.clear();
    await db.syncOutbox.clear();
  });

  it('registra un ingreso diario y genera sugerencias de asignación para deudas urgentes', async () => {
    // 1. Crear cuenta
    const acc = await createAccount({
      name: 'Mercado Pago',
      type: 'wallet',
      initialBalance: 0
    });

    // 2. Crear una deuda urgente que vence en 2 días con riesgo de corte
    const deudaCritica: Debt = {
      id: 'debt-luz',
      userId: 'local-user',
      name: 'Factura de Luz',
      creditor: 'Edenor',
      totalAmount: 20000,
      remainingAmount: 20000,
      dueDate: '2026-10-13',
      consequenceType: 'critical_cut',
      status: 'pending',
      isDeleted: false,
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z'
    };
    await db.debts.add(deudaCritica);

    // 3. Registrar cobro diario de $50.000
    const result = await registerDailyIncome({
      amount: 50000,
      accountId: acc.id,
      origin: 'Venta Diaria',
      date: '2026-10-11',
      notes: 'Venta de productos'
    });

    expect(result.transaction.amount).toBe(50000);
    expect(result.freeBalanceAvailable).toBe(50000);

    // Debe sugerir reservar $20.000 para la Factura de Luz
    expect(result.suggestedAllocations.length).toBeGreaterThan(0);
    const allocLuz = result.suggestedAllocations.find((a) => a.targetId === 'debt-luz');
    expect(allocLuz).toBeDefined();
    expect(allocLuz?.suggestedAmount).toBe(20000);
    expect(allocLuz?.priorityLevel).toBe('urgente');
  });

  it('permite al usuario confirmar la asignación y crea las reservas virtuales en Dexie', async () => {
    const acc = await createAccount({
      name: 'Efectivo',
      type: 'cash',
      initialBalance: 100000
    });
    expect(acc.currentBalance).toBe(100000);

    const reservaConfirmada = await applyConfirmedAllocations([
      {
        targetType: 'debt',
        targetId: 'debt-test',
        name: 'Tarjeta Visa',
        amount: 35000
      }
    ]);

    expect(reservaConfirmada.length).toBe(1);
    expect(reservaConfirmada[0].amountReserved).toBe(35000);
    expect(reservaConfirmada[0].status).toBe('active');

    // Comprobar en base de datos
    const enDB = await db.virtualReserves.get(reservaConfirmada[0].id);
    expect(enDB?.amountReserved).toBe(35000);

    // Comprobar que se registró en outbox para sync
    const outbox = await db.syncOutbox.filter((s) => s.entityName === 'virtual_reserves').toArray();
    expect(outbox.length).toBe(1);
  });
});
