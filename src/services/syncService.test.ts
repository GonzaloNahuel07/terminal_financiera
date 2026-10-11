import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import {
  toSnakeCaseRecord,
  toCamelCaseRecord,
  processSyncOutbox,
  retryFailedSyncItems,
  getSyncStatus
} from './syncService';
import * as supabaseClientModule from '../supabase/client';

describe('Servicio de Sincronización Segura y Outbox (syncService)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.syncOutbox.clear();
    vi.restoreAllMocks();
  });

  it('convierte correctamente claves entre camelCase y snake_case', () => {
    const original = {
      userId: 'user-123',
      initialBalance: 50000,
      createdAt: '2026-10-11T12:00:00Z'
    };

    const snake = toSnakeCaseRecord(original);
    expect(snake.user_id).toBe('user-123');
    expect(snake.initial_balance).toBe(50000);
    expect(snake.created_at).toBe('2026-10-11T12:00:00Z');

    const camel = toCamelCaseRecord<typeof original>(snake);
    expect(camel.userId).toBe('user-123');
    expect(camel.initialBalance).toBe(50000);
    expect(camel.createdAt).toBe('2026-10-11T12:00:00Z');
  });

  it('no falla ni arroja errores cuando Supabase no está configurado (modo 100% offline)', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);

    // Agregar elemento a la bandeja
    await db.syncOutbox.add({
      id: 'outbox-1',
      mutationId: 'mut-1',
      entityName: 'accounts',
      action: 'insert',
      payload: { id: 'acc-1', name: 'Efectivo' },
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    });

    const result = await processSyncOutbox();
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);

    const status = await getSyncStatus();
    expect(status.pendingCount).toBe(1);
    expect(status.isConfigured).toBe(false);
  });

  it('procesa y vacía la cola de salida cuando el cliente de Supabase responde exitosamente', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({
      upsert: mockUpsert
    });

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({
      from: mockFrom
    } as any);

    await db.syncOutbox.add({
      id: 'outbox-ok',
      mutationId: 'mut-ok',
      entityName: 'accounts',
      action: 'insert',
      payload: { id: 'acc-ok', name: 'Galicia', currentBalance: 80000 },
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    });

    const result = await processSyncOutbox();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockFrom).toHaveBeenCalledWith('accounts');

    // Debe haberse eliminado de la outbox local
    const remaining = await db.syncOutbox.toArray();
    expect(remaining.length).toBe(0);
  });

  it('marca como fallido y preserva el elemento en la cola si ocurre un error de red', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({
      error: new Error('Error de conexión con la nube')
    });
    const mockFrom = vi.fn().mockReturnValue({
      upsert: mockUpsert
    });

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({
      from: mockFrom
    } as any);

    await db.syncOutbox.add({
      id: 'outbox-fail',
      mutationId: 'mut-fail',
      entityName: 'transactions',
      action: 'insert',
      payload: { id: 'tx-fail', amount: 15000 },
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    });

    const result = await processSyncOutbox();
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);

    // Debe seguir en la outbox pero marcado como fallido
    const item = await db.syncOutbox.get('outbox-fail');
    expect(item).toBeDefined();
    expect(item?.syncStatus).toBe('failed');
    expect(item?.errorMessage).toContain('Error de conexión');

    // Reintentar fallidos
    await retryFailedSyncItems();
    const retried = await db.syncOutbox.get('outbox-fail');
    expect(retried?.syncStatus).toBe('failed'); // Intentó de nuevo y falló con el mismo mock
  });
});
