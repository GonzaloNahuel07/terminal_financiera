import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Scale,
  Search,
  Filter,
  Edit2,
  Trash2,
  Calendar
} from 'lucide-react';
import type { Account, Transaction } from '../../types';
import { formatPesos } from '../../utils/money';
import { voidTransaction } from '../../services/transactionService';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  onEditTransaction: (tx: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  onEditTransaction
}) => {
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const accountMap = new Map<string, string>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc.name);
  }

  const handleVoid = async (id: string, description: string, amount: number) => {
    if (confirm(`¿Estás seguro de anular el movimiento "${description}" por ${formatPesos(amount)}? Se recalcularán los saldos y quedará registro de la anulación.`)) {
      await voidTransaction(id);
    }
  };

  const filtered = transactions.filter((tx) => {
    if (filterAccount !== 'all') {
      if (tx.accountId !== filterAccount && tx.destinationAccountId !== filterAccount) {
        return false;
      }
    }

    if (filterType !== 'all' && tx.type !== filterType) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchNotes = tx.notes?.toLowerCase().includes(q) ?? false;
      if (!matchDesc && !matchCat && !matchNotes) return false;
    }

    return true;
  });

  const getTypeBadge = (tx: Transaction) => {
    switch (tx.type) {
      case 'income':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1b2a22] text-fey-growth border border-[#2b4c38]">
            <ArrowDownRight className="w-3 h-3" />
            Ingreso
          </span>
        );
      case 'expense':
      case 'debt_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2a1414] text-fey-ember border border-[#441a1a]">
            <ArrowUpRight className="w-3 h-3" />
            Gasto
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#152336] text-fey-signal border border-[#23426e]">
            <ArrowLeftRight className="w-3 h-3" />
            Transferencia
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#242014] text-amber-300 border border-[#42381b]">
            <Scale className="w-3 h-3" />
            Ajuste
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-fey-display text-white">
            Historial de Movimientos.
          </h2>
          <p className="text-xs text-fey-graphite">
            {filtered.length} registro(s) encontrados
          </p>
        </div>

        {/* Barra de Filtros Responsive */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[130px] sm:w-44">
            <Search className="w-3.5 h-3.5 text-fey-graphite absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#141414] border border-[#242424] rounded-full pl-8 pr-3 py-1.5 text-xs text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#141414] border border-[#242424] rounded-full px-2.5 py-1 text-xs">
            <Filter className="w-3 h-3 text-fey-graphite" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-fey-mist focus:outline-none text-xs"
            >
              <option value="all" className="bg-[#141414]">Todos los tipos</option>
              <option value="income" className="bg-[#141414]">Ingresos</option>
              <option value="expense" className="bg-[#141414]">Gastos</option>
              <option value="transfer" className="bg-[#141414]">Transferencias</option>
              <option value="adjustment" className="bg-[#141414]">Ajustes</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#141414] border border-[#242424] rounded-full px-2.5 py-1 text-xs">
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="bg-transparent text-fey-mist focus:outline-none text-xs"
            >
              <option value="all" className="bg-[#141414]">Todas las cuentas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-[#141414]">
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-8 text-center">
          <p className="text-xs text-fey-graphite">No hay movimientos registrados con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#242424] rounded-2xl overflow-hidden divide-y divide-[#1f1f1f] shadow-fey-card">
          {filtered.map((tx) => {
            const sourceName = accountMap.get(tx.accountId) ?? 'Cuenta Desconocida';
            const destName = tx.destinationAccountId ? accountMap.get(tx.destinationAccountId) : null;

            return (
              <div
                key={tx.id}
                className="p-3.5 sm:p-4 hover:bg-[#1a1a1a]/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 fey-halo-hover"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{getTypeBadge(tx)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {tx.description}
                      </span>
                      <span className="text-[10px] text-fey-graphite bg-[#191919] px-2 py-0.5 rounded-full border border-[#282828] shrink-0">
                        {tx.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-fey-graphite mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-fey-smoke" />
                        {tx.date}
                      </span>

                      <span>•</span>

                      {tx.type === 'transfer' ? (
                        <span>
                          De <strong className="text-fey-mist">{sourceName}</strong> hacia <strong className="text-fey-mist">{destName}</strong>
                        </span>
                      ) : (
                        <span>
                          Cuenta: <strong className="text-fey-mist">{sourceName}</strong>
                        </span>
                      )}

                      {tx.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-fey-smoke truncate max-w-[200px]">"{tx.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1f1f1f]">
                  <div className="text-left sm:text-right">
                    <span
                      className={`text-sm sm:text-base font-mono font-bold block ${
                        tx.type === 'income'
                          ? 'text-fey-growth'
                          : tx.type === 'transfer'
                          ? 'text-fey-signal'
                          : 'text-fey-ember'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatPesos(tx.amount)}
                    </span>
                  </div>

                  {/* Acciones de edición y anulación */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      title="Editar movimiento"
                      className="p-1.5 text-fey-graphite hover:text-white rounded-lg hover:bg-[#222222] transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleVoid(tx.id, tx.description, tx.amount)}
                      title="Anular movimiento"
                      className="p-1.5 text-fey-graphite hover:text-red-400 rounded-lg hover:bg-[#222222] transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
