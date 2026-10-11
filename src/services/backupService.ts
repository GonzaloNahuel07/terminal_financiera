import { db } from '../db';
import type {
  Account,
  Transaction,
  Debt,
  RecurringObligation,
  VirtualReserve,
  SavingsGoal,
  WeeklyPlan
} from '../types';

export interface BackupPayload {
  app: 'AppFinanzasPWA';
  version: string;
  schemaVersion: number;
  exportedAt: string;
  counts: {
    accounts: number;
    transactions: number;
    debts: number;
    recurringObligations: number;
    virtualReserves: number;
    savingsGoals: number;
    weeklyPlans: number;
  };
  data: {
    accounts: Account[];
    transactions: Transaction[];
    debts: Debt[];
    recurringObligations: RecurringObligation[];
    virtualReserves: VirtualReserve[];
    savingsGoals: SavingsGoal[];
    weeklyPlans: WeeklyPlan[];
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredCounts: BackupPayload['counts'];
}

/**
 * Genera el paquete completo de copia de seguridad en formato JSON estructurado.
 */
export async function generateBackupPayload(): Promise<BackupPayload> {
  const accounts = await db.accounts.toArray();
  const transactions = await db.transactions.toArray();
  const debts = await db.debts.toArray();
  const recurringObligations = await db.recurringObligations.toArray();
  const virtualReserves = await db.virtualReserves.toArray();
  const savingsGoals = await db.savingsGoals.toArray();
  const weeklyPlans = await db.weeklyPlans.toArray();

  return {
    app: 'AppFinanzasPWA',
    version: '1.0.0',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: {
      accounts: accounts.length,
      transactions: transactions.length,
      debts: debts.length,
      recurringObligations: recurringObligations.length,
      virtualReserves: virtualReserves.length,
      savingsGoals: savingsGoals.length,
      weeklyPlans: weeklyPlans.length
    },
    data: {
      accounts,
      transactions,
      debts,
      recurringObligations,
      virtualReserves,
      savingsGoals,
      weeklyPlans
    }
  };
}

/**
 * Dispara la descarga del archivo de respaldo en el navegador.
 */
export async function downloadBackupFile(): Promise<void> {
  const payload = await generateBackupPayload();
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzas_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Valida un JSON importado antes de aplicar cambios.
 */
export function validateBackupJson(jsonString: string): {
  isValid: boolean;
  payload?: BackupPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString) as BackupPayload;
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'El archivo no contiene un objeto JSON válido.' };
    }

    if (parsed.app !== 'AppFinanzasPWA' || !parsed.data) {
      return {
        isValid: false,
        error: 'El archivo no corresponde a una copia de seguridad válida de App Finanzas.'
      };
    }

    const { data } = parsed;
    if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
      return {
        isValid: false,
        error: 'La estructura de datos de cuentas o transacciones está corrupta o incompleta.'
      };
    }

    return { isValid: true, payload: parsed };
  } catch (err) {
    return {
      isValid: false,
      error: `Error de sintaxis JSON: ${err instanceof Error ? err.message : 'Archivo no parseable'}`
    };
  }
}

/**
 * Restaura los datos desde una copia de seguridad JSON.
 * @param jsonString Contenido serializado del archivo JSON.
 * @param mode 'merge' combina registros existentes, 'replace' limpia la base e instala el backup.
 */
export async function restoreFromBackup(
  jsonString: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<RestoreResult> {
  const validation = validateBackupJson(jsonString);
  if (!validation.isValid || !validation.payload) {
    throw new Error(validation.error || 'Archivo de copia de seguridad inválido.');
  }

  const { data } = validation.payload;

  await db.transaction(
    'rw',
    [
      db.accounts,
      db.transactions,
      db.debts,
      db.recurringObligations,
      db.virtualReserves,
      db.savingsGoals,
      db.weeklyPlans
    ],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.accounts.clear(),
          db.transactions.clear(),
          db.debts.clear(),
          db.recurringObligations.clear(),
          db.virtualReserves.clear(),
          db.savingsGoals.clear(),
          db.weeklyPlans.clear()
        ]);
      }

      if (data.accounts?.length) await db.accounts.bulkPut(data.accounts);
      if (data.transactions?.length) await db.transactions.bulkPut(data.transactions);
      if (data.debts?.length) await db.debts.bulkPut(data.debts);
      if (data.recurringObligations?.length) await db.recurringObligations.bulkPut(data.recurringObligations);
      if (data.virtualReserves?.length) await db.virtualReserves.bulkPut(data.virtualReserves);
      if (data.savingsGoals?.length) await db.savingsGoals.bulkPut(data.savingsGoals);
      if (data.weeklyPlans?.length) await db.weeklyPlans.bulkPut(data.weeklyPlans);
    }
  );

  return {
    success: true,
    message: `Restauración exitosa en modo ${mode === 'replace' ? 'reemplazo total' : 'fusión'}.`,
    restoredCounts: {
      accounts: data.accounts?.length ?? 0,
      transactions: data.transactions?.length ?? 0,
      debts: data.debts?.length ?? 0,
      recurringObligations: data.recurringObligations?.length ?? 0,
      virtualReserves: data.virtualReserves?.length ?? 0,
      savingsGoals: data.savingsGoals?.length ?? 0,
      weeklyPlans: data.weeklyPlans?.length ?? 0
    }
  };
}
