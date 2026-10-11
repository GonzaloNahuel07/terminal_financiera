import { db } from '../db';
import { getDaysUntilDue } from '../core/debts';
import { formatPesos } from '../utils/money';

export interface DueAlertItem {
  id: string;
  name: string;
  type: 'debt' | 'recurring';
  amount: number;
  dueDate: string;
  days: number;
}

/**
 * Consulta las deudas y obligaciones que vencen en los próximos 3 días o están vencidas.
 */
export async function getUpcomingDueAlerts(): Promise<DueAlertItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const debts = await db.debts.filter((d) => !d.isDeleted && d.status !== 'paid').toArray();
  const recurring = await db.recurringObligations.filter((r) => !r.isDeleted && r.isActive).toArray();
  const reserves = await db.virtualReserves.filter((r) => r.status === 'active').toArray();

  const alerts: DueAlertItem[] = [];

  for (const debt of debts) {
    const days = getDaysUntilDue(debt.dueDate, today);
    const isReserved = reserves.some((r) => r.targetId === debt.id && r.status === 'active');
    // Si no está cubierta por reserva y vence en <= 3 días o ya venció
    if (!isReserved && days <= 3) {
      alerts.push({
        id: debt.id,
        name: debt.name,
        type: 'debt',
        amount: debt.remainingAmount,
        dueDate: debt.dueDate,
        days
      });
    }
  }

  const [year, month] = today.split('-').map(Number);
  for (const rec of recurring) {
    const dueDay = Math.min(rec.dueDay, 28);
    const dueDateStr = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
    const days = getDaysUntilDue(dueDateStr, today);
    const isReserved = reserves.some((r) => r.targetId === rec.id && r.status === 'active');

    if (!isReserved && days <= 3) {
      alerts.push({
        id: rec.id,
        name: rec.name,
        type: 'recurring',
        amount: rec.expectedAmount,
        dueDate: dueDateStr,
        days
      });
    }
  }

  return alerts.sort((a, b) => a.days - b.days);
}

/**
 * Solicita permisos de notificación al usuario.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Dispara una notificación web local si hay obligaciones inminentes.
 */
export async function sendDueObligationsNotification(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const alerts = await getUpcomingDueAlerts();
  if (alerts.length === 0) {
    return false;
  }

  const firstAlert = alerts[0];
  let title = '';
  let body = '';

  if (firstAlert.days < 0) {
    title = `⚠️ Vencimiento Impago: ${firstAlert.name}`;
    body = `Venció hace ${Math.abs(firstAlert.days)} días por ${formatPesos(firstAlert.amount)}.`;
  } else if (firstAlert.days === 0) {
    title = `🚨 Vence Hoy: ${firstAlert.name}`;
    body = `Tenés que abonar ${formatPesos(firstAlert.amount)} hoy.`;
  } else {
    title = `⏳ Próximo Vencimiento: ${firstAlert.name}`;
    body = `Vence en ${firstAlert.days} días (${firstAlert.dueDate}) por ${formatPesos(firstAlert.amount)}.`;
  }

  if (alerts.length > 1) {
    body += ` Y ${alerts.length - 1} obligación(es) más pendientes.`;
  }

  try {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'finanzas-due-alert'
    });
    return true;
  } catch {
    return false;
  }
}
