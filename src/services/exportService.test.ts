import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { exportTransactionsToCSV } from './exportService';
import { createAccount } from './accountService';
import { createTransaction } from './transactionService';

describe('ExportService - Exportación a CSV y PDF', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
  });

  it('genera y descarga un archivo CSV con transacciones', async () => {
    const acc = await createAccount({
      name: 'Efectivo',
      type: 'cash',
      initialBalance: 50000
    });

    await createTransaction({
      accountId: acc.id,
      type: 'income',
      amount: 12000,
      category: 'Honorarios',
      description: 'Cobro por servicio',
      date: '2026-10-11'
    });

    // Mock document.createElement and URL
    const clickMock = vi.fn();
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURLMock = vi.fn();

    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickMock;
      }
      return el;
    });

    await exportTransactionsToCSV();

    expect(clickMock).toHaveBeenCalled();
    expect(createObjectURLMock).toHaveBeenCalled();
  });
});
