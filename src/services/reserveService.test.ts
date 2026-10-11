import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { createAccount } from './accountService';
import { createDebt } from './debtService';
import {
  allocateOrUpdateReserve,
  releaseReserve,
  calculateLiquidityMetrics,
  getActiveReserves
} from './reserveService';

describe('Servicio de Reservas Virtuales y Métricas de Liquidez (reserveService)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.debts.clear();
    await db.recurringObligations.clear();
    await db.virtualReserves.clear();
    await db.syncOutbox.clear();
  });

  it('asigna una reserva virtual respetando la invariante R_total <= S_real', async () => {
    // 1. Cuenta con saldo real de $100.000
    await createAccount({
      name: 'Banco Galicia',
      type: 'bank',
      initialBalance: 100000
    });

    const debt = await createDebt({
      name: 'Tarjeta Visa',
      creditor: 'Banco',
      totalAmount: 50000,
      dueDate: '2026-10-25',
      consequenceType: 'punitive_interest'
    });

    // 2. Asignar $40.000 a la deuda
    const reserve = await allocateOrUpdateReserve({
      targetType: 'debt',
      targetId: debt.id,
      targetName: debt.name,
      amount: 40000
    });

    expect(reserve.amountReserved).toBe(40000);
    expect(reserve.status).toBe('active');

    const metrics = await calculateLiquidityMetrics();
    expect(metrics.totalRealBalance).toBe(100000);
    expect(metrics.totalReserves).toBe(40000);
    expect(metrics.freeBalance).toBe(60000);
  });

  it('rechaza una reserva si el monto supera el saldo libre disponible', async () => {
    await createAccount({
      name: 'Efectivo',
      type: 'cash',
      initialBalance: 50000
    });

    // Intentar reservar $70.000 cuando solo hay $50.000
    await expect(
      allocateOrUpdateReserve({
        targetType: 'debt',
        targetId: 'debt-x',
        targetName: 'Deuda Excesiva',
        amount: 70000
      })
    ).rejects.toThrow('No hay saldo libre suficiente');
  });

  it('permite reajustar una reserva existente sin duplicar el dinero reservado', async () => {
    await createAccount({
      name: 'Mercado Pago',
      type: 'wallet',
      initialBalance: 100000
    });

    // Crear reserva inicial de $30.000
    await allocateOrUpdateReserve({
      targetType: 'recurring_obligation',
      targetId: 'rec-luz',
      targetName: 'Factura Luz',
      amount: 30000
    });

    let active = await getActiveReserves();
    expect(active.length).toBe(1);
    expect(active[0].amountReserved).toBe(30000);

    // Ajustar a $45.000 para el mismo objetivo
    await allocateOrUpdateReserve({
      targetType: 'recurring_obligation',
      targetId: 'rec-luz',
      targetName: 'Factura Luz',
      amount: 45000
    });

    active = await getActiveReserves();
    expect(active.length).toBe(1); // Sigue siendo 1 sola reserva
    expect(active[0].amountReserved).toBe(45000);

    const metrics = await calculateLiquidityMetrics();
    expect(metrics.freeBalance).toBe(55000); // 100.000 - 45.000
  });

  it('libera una reserva virtual y reintegra el dinero inmediatamente a saldo libre', async () => {
    await createAccount({
      name: 'Efectivo',
      type: 'cash',
      initialBalance: 80000
    });

    const reserve = await allocateOrUpdateReserve({
      targetType: 'debt',
      targetId: 'debt-prestamo',
      targetName: 'Préstamo',
      amount: 30000
    });

    let metrics = await calculateLiquidityMetrics();
    expect(metrics.freeBalance).toBe(50000);

    // Liberar reserva
    const released = await releaseReserve(reserve.id);
    expect(released.status).toBe('released');

    metrics = await calculateLiquidityMetrics();
    expect(metrics.totalReserves).toBe(0);
    expect(metrics.freeBalance).toBe(80000); // Dinero 100% libre de nuevo
  });
});
