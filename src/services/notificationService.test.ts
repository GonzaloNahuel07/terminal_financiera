import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { getUpcomingDueAlerts } from './notificationService';
import { createDebt } from './debtService';

describe('NotificationService - Alertas de Vencimiento', () => {
  beforeEach(async () => {
    await db.debts.clear();
    await db.recurringObligations.clear();
    await db.virtualReserves.clear();
  });

  it('detecta deudas que vencen en 3 días o menos', async () => {
    const today = new Date();
    const inTwoDays = new Date(today);
    inTwoDays.setDate(today.getDate() + 2);
    const dueDate = inTwoDays.toISOString().split('T')[0];

    await createDebt({
      name: 'Tarjeta Inminente',
      creditor: 'Banco',
      totalAmount: 30000,
      dueDate,
      consequenceType: 'punitive_interest'
    });

    const alerts = await getUpcomingDueAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].name).toBe('Tarjeta Inminente');
    expect(alerts[0].amount).toBe(30000);
  });

  it('no alerta si la deuda ya está cubierta al 100% por una reserva activa', async () => {
    const today = new Date().toISOString().split('T')[0];

    const debt = await createDebt({
      name: 'Deuda Cubierta',
      creditor: 'Banco',
      totalAmount: 15000,
      dueDate: today,
      consequenceType: 'punitive_interest'
    });

    // Agregar reserva activa
    await db.virtualReserves.add({
      id: 'res-test',
      userId: 'default_user',
      targetType: 'debt',
      targetId: debt.id,
      targetName: debt.name,
      amountReserved: 15000,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const alerts = await getUpcomingDueAlerts();
    expect(alerts.length).toBe(0);
  });
});
