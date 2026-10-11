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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownRight className="w-3 h-3" />
            Ingreso
          </span>
        );
      case 'expense':
      case 'debt_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <ArrowUpRight className="w-3 h-3" />
            Gasto
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ArrowLeftRight className="w-3 h-3" />
            Transferencia
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
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
          <h2 className="text-base font-bold text-white">Historial de Movimientos</h2>
          <p className="text-xs text-slate-400">
            {filtered.length} registro(s) encontrados
          </p>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
              <option value="transfer">Transferencias</option>
              <option value="adjustment">Ajustes</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs">
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none"
            >
              <option value="all">Todas las cuentas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-400">No hay movimientos registrados con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800 shadow-xl">
          {filtered.map((tx) => {
            const sourceName = accountMap.get(tx.accountId) ?? 'Cuenta Desconocida';
            const destName = tx.destinationAccountId ? accountMap.get(tx.destinationAccountId) : null;

            return (
              <div
                key={tx.id}
                className="p-4 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getTypeBadge(tx)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {tx.description}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        {tx.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {tx.date}
                      </span>

                      <span>•</span>

                      {tx.type === 'transfer' ? (
                        <span>
                          De <strong className="text-slate-300">{sourceName}</strong> hacia <strong className="text-slate-300">{destName}</strong>
                        </span>
                      ) : (
                        <span>
                          Cuenta: <strong className="text-slate-300">{sourceName}</strong>
                        </span>
                      )}

                      {tx.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-500">"{tx.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span
                      className={`text-base font-mono font-bold block ${
                        tx.type === 'income'
                          ? 'text-emerald-400'
                          : tx.type === 'transfer'
                          ? 'text-blue-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatPesos(tx.amount)}
                    </span>
                  </div>

                  {/* Acciones de edición y anulación */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      title="Editar movimiento"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleVoid(tx.id, tx.description, tx.amount)}
                      title="Anular movimiento"
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
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
