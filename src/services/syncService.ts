import { db } from '../db';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import type { SyncOutboxItem } from '../types';

const STORAGE_KEY_LAST_SYNC = 'fey_last_sync_timestamp';

/**
 * Convierte un objeto con claves en camelCase a snake_case para PostgreSQL/Supabase.
 */
export function toSnakeCaseRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Convierte un objeto con claves en snake_case a camelCase para IndexedDB/TypeScript.
 */
export function toCamelCaseRecord<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

/**
 * Procesa la cola de salida (syncOutbox) enviando las mutaciones pendientes a Supabase.
 * Ejecuta en orden FIFO para preservar la causalidad de las operaciones.
 */
export async function processSyncOutbox(): Promise<{ processed: number; failed: number }> {
  if (!isSupabaseConfigured()) {
    return { processed: 0, failed: 0 };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { processed: 0, failed: 0 };
  }

  // Obtener mutaciones pendientes o fallidas ordenadas por creación ascendente
  const pendingItems = await db.syncOutbox
    .filter((item) => item.syncStatus === 'pending' || item.syncStatus === 'failed')
    .toArray();

  pendingItems.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let processed = 0;
  let failed = 0;

  for (const item of pendingItems) {
    try {
      // Marcar temporalmente como sincronizando
      await db.syncOutbox.update(item.id, { syncStatus: 'syncing' });

      const tableName = item.entityName;
      const snakePayload = toSnakeCaseRecord(item.payload);

      if (item.action === 'insert' || item.action === 'update') {
        // Upsert idempotente basado en id primario
        const { error } = await supabase
          .from(tableName)
          .upsert(snakePayload, { onConflict: 'id' });

        if (error) throw error;
      } else if (item.action === 'delete') {
        const targetId = (item.payload.id as string) || (snakePayload.id as string);
        if (targetId) {
          // Marcar baja lógica en la base remota
          const { error } = await supabase
            .from(tableName)
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', targetId);

          if (error) throw error;
        }
      }

      // Si todo salió bien, eliminar de la cola de salida local
      await db.syncOutbox.delete(item.id);
      processed++;
    } catch (err) {
      failed++;
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido de sincronización';
      await db.syncOutbox.update(item.id, {
        syncStatus: 'failed',
        errorMessage
      });
      // Detener procesamiento en cascada si hay falla de red para preservar orden estricto
      break;
    }
  }

  return { processed, failed };
}

/**
 * Descarga cambios remotos desde Supabase y los fusiona en IndexedDB aplicando Last-Write-Wins.
 */
export async function pullRemoteChanges(): Promise<{ pulled: number }> {
  if (!isSupabaseConfigured()) {
    return { pulled: 0 };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { pulled: 0 };
  }

  const lastSync = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LAST_SYNC) : null;
  const tables: Array<{
    name: SyncOutboxItem['entityName'];
    table: typeof db.accounts | typeof db.transactions | typeof db.debts | typeof db.recurringObligations | typeof db.virtualReserves | typeof db.savingsGoals | typeof db.weeklyPlans;
  }> = [
    { name: 'accounts', table: db.accounts },
    { name: 'transactions', table: db.transactions },
    { name: 'debts', table: db.debts },
    { name: 'recurring_obligations', table: db.recurringObligations },
    { name: 'virtual_reserves', table: db.virtualReserves },
    { name: 'savings_goals', table: db.savingsGoals },
    { name: 'weekly_plans', table: db.weeklyPlans }
  ];

  let totalPulled = 0;

  for (const { name, table } of tables) {
    let query = supabase.from(name).select('*');
    if (lastSync) {
      query = query.gt('updated_at', lastSync);
    }

    const { data, error } = await query;
    if (error || !data) continue;

    for (const remoteRow of data) {
      const camelRecord = toCamelCaseRecord<Record<string, unknown>>(remoteRow);
      const recordId = camelRecord.id as string;
      const remoteUpdatedAt = (camelRecord.updatedAt as string) || '';

      if (recordId) {
        // Verificar si existe localmente para aplicar Last-Write-Wins
        const local = await (table as any).get(recordId);
        if (!local || !local.updatedAt || remoteUpdatedAt >= local.updatedAt) {
          await (table as any).put(camelRecord);
          totalPulled++;
        }
      }
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
  }

  return { pulled: totalPulled };
}

/**
 * Dispara una sincronización completa bidireccional (Push de Outbox + Pull Remoto).
 */
export async function triggerFullSync(): Promise<{
  success: boolean;
  pushed: number;
  failed: number;
  pulled: number;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      pushed: 0,
      failed: 0,
      pulled: 0,
      error: 'Supabase no está configurado.'
    };
  }

  try {
    const { processed, failed } = await processSyncOutbox();
    const { pulled } = await pullRemoteChanges();

    return {
      success: failed === 0,
      pushed: processed,
      failed,
      pulled,
      error: failed > 0 ? 'Algunos elementos no pudieron sincronizarse' : undefined
    };
  } catch (err) {
    return {
      success: false,
      pushed: 0,
      failed: 1,
      pulled: 0,
      error: err instanceof Error ? err.message : 'Error durante la sincronización'
    };
  }
}

/**
 * Reintenta sincronizar inmediatamente los elementos fallidos.
 */
export async function retryFailedSyncItems(): Promise<void> {
  const failedItems = await db.syncOutbox.filter((s) => s.syncStatus === 'failed').toArray();
  for (const item of failedItems) {
    await db.syncOutbox.update(item.id, { syncStatus: 'pending', errorMessage: undefined });
  }
  await processSyncOutbox();
}

/**
 * Obtiene el estado actual de la sincronización y la bandeja de salida.
 */
export async function getSyncStatus(): Promise<{
  pendingCount: number;
  failedCount: number;
  isConfigured: boolean;
  lastSyncAt: string | null;
}> {
  const pendingCount = await db.syncOutbox.filter((s) => s.syncStatus === 'pending' || s.syncStatus === 'syncing').count();
  const failedCount = await db.syncOutbox.filter((s) => s.syncStatus === 'failed').count();
  const lastSyncAt = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LAST_SYNC) : null;

  return {
    pendingCount,
    failedCount,
    isConfigured: isSupabaseConfigured(),
    lastSyncAt
  };
}
