import React, { useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import type { Debt, RecurringObligation, Account, VirtualReserve } from '../types';
import { DebtList } from './Debts/DebtList';
import { RecurringList } from './Recurring/RecurringList';

interface DebtsAndRecurringViewProps {
  debts: Debt[];
  recurring: RecurringObligation[];
  accounts: Account[];
  reserves: VirtualReserve[];
}

export const DebtsAndRecurringView: React.FC<DebtsAndRecurringViewProps> = ({
  debts,
  recurring,
  accounts,
  reserves
}) => {
  const [subTab, setSubTab] = useState<'debts' | 'recurring'>('debts');

  const pendingDebtsCount = debts.filter((d) => !d.isDeleted && d.status !== 'paid').length;
  const activeRecurringCount = recurring.filter((r) => !r.isDeleted && r.isActive).length;

  return (
    <div className="space-y-6">
      {/* Switcher de Subpestañas (Pill Navigation Fey) */}
      <div className="flex items-center gap-2 p-1 bg-[#131313] border border-[#222222] rounded-full w-fit">
        <button
          onClick={() => setSubTab('debts')}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
            subTab === 'debts'
              ? 'bg-white text-black shadow-fey-button font-bold'
              : 'text-fey-graphite hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Deudas y Pasivos ({pendingDebtsCount})
        </button>

        <button
          onClick={() => setSubTab('recurring')}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
            subTab === 'recurring'
              ? 'bg-white text-black shadow-fey-button font-bold'
              : 'text-fey-graphite hover:text-white'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Gastos Fijos ({activeRecurringCount})
        </button>
      </div>

      {subTab === 'debts' ? (
        <DebtList debts={debts} accounts={accounts} reserves={reserves} />
      ) : (
        <RecurringList recurring={recurring} accounts={accounts} reserves={reserves} />
      )}
    </div>
  );
};
