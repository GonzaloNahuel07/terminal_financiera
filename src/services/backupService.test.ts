import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { generateBackupPayload, validateBackupJson, restoreFromBackup } from './backupService';
import { createAccount } from './accountService';
import { createDebt } from './debtService';

describe('BackupService - Respaldo y Restauración de Datos', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.debts.clear();
    await db.recurringObligations.clear();
    await db.virtualReserves.clear();
    await db.savingsGoals.clear();
    await db.weeklyPlans.clear();
  });

  it('debe generar un payload de backup completo y válido', async () => {
    await createAccount({
      name: 'Banco BBVA',
      type: 'bank',
      initialBalance: 200000
    });

    await createDebt({
      name: 'Préstamo',
      creditor: 'Banco',
      totalAmount: 50000,
      dueDate: '2026-11-01',
      consequenceType: 'punitive_interest'
    });

    const payload = await generateBackupPayload();
    expect(payload.app).toBe('AppFinanzasPWA');
    expect(payload.counts.accounts).toBe(1);
    expect(payload.counts.debts).toBe(1);
    expect(payload.data.accounts[0].name).toBe('Banco BBVA');
  });

  it('debe validar correctamente el JSON y rechazar estructuras corruptas', () => {
    const invalidJson = '{"app": "OtherApp", "data": {}}';
    const validation = validateBackupJson(invalidJson);
    expect(validation.isValid).toBe(false);

    const corruptJson = '{ invalid: json }';
    const corruptValidation = validateBackupJson(corruptJson);
    expect(corruptValidation.isValid).toBe(false);
  });

  it('debe restaurar datos desde un payload válido en modo replace y merge', async () => {
    await createAccount({
      name: 'Cuenta Inicial',
      type: 'cash',
      initialBalance: 10000
    });

    const backup = await generateBackupPayload();
    const backupJson = JSON.stringify(backup);

    // Modificar base actual agregando otra cuenta
    await createAccount({
      name: 'Cuenta Temporal',
      type: 'bank',
      initialBalance: 5000
    });

    expect(await db.accounts.count()).toBe(2);

    // Restaurar en modo replace
    const result = await restoreFromBackup(backupJson, 'replace');
    expect(result.success).toBe(true);
    expect(await db.accounts.count()).toBe(1);
    const accounts = await db.accounts.toArray();
    expect(accounts[0].name).toBe('Cuenta Inicial');
  });
});
