import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { performFinancialAudit, autoRepairFinancialInconsistencies } from './auditService';
import { createAccount } from './accountService';
import { createDebt } from './debtService';

describe('AuditService - Motor de Salud e Integridad Financiera', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.debts.clear();
    await db.recurringObligations.clear();
    await db.virtualReserves.clear();
    await db.savingsGoals.clear();
    await db.syncOutbox.clear();
  });

  it('debe generar un reporte inicial con advertencias si no hay cuentas', async () => {
    const report = await performFinancialAudit();
    expect(report.totalChecks).toBeGreaterThan(0);
    expect(report.checks.some((c) => c.id === 'accounts-presence' && c.status === 'warning')).toBe(true);
  });

  it('debe detectar coherencia cuando hay cuentas activas y reservas válidas', async () => {
    await createAccount({
      name: 'Banco Galicia',
      type: 'bank',
      initialBalance: 150000
    });

    const report = await performFinancialAudit();
    const accountCheck = report.checks.find((c) => c.id === 'accounts-presence');
    expect(accountCheck?.status).toBe('pass');
    expect(report.metrics.totalRealBalance).toBe(150000);
  });

  it('debe detectar y auto-reparar deudas saldadas con estado inconsistente', async () => {
    await createAccount({
      name: 'Efectivo',
      type: 'cash',
      initialBalance: 50000
    });

    const debt = await createDebt({
      name: 'Deuda Tarjeta',
      creditor: 'Visa',
      totalAmount: 20000,
      dueDate: '2026-10-25',
      consequenceType: 'punitive_interest'
    });

    // Forzar inconsistencia manual (saldo 0 pero estado pending)
    await db.debts.update(debt.id, { remainingAmount: 0, status: 'pending' });

    let report = await performFinancialAudit();
    const debtCheck = report.checks.find((c) => c.id === 'debts-status-sync');
    expect(debtCheck?.status).toBe('warning');

    // Ejecutar auto-reparación
    const repairResult = await autoRepairFinancialInconsistencies();
    expect(repairResult.repairedCount).toBeGreaterThan(0);

    const updatedDebt = await db.debts.get(debt.id);
    expect(updatedDebt?.status).toBe('paid');

    // Verificar reporte tras reparación
    report = await performFinancialAudit();
    const debtCheckAfter = report.checks.find((c) => c.id === 'debts-status-sync');
    expect(debtCheckAfter?.status).toBe('pass');
  });
});
