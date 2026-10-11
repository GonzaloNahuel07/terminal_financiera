import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Scale } from 'lucide-react';
import type { Account, Transaction, TransactionType } from '../../types';
import { createTransaction, updateTransaction } from '../../services/transactionService';
import { formatPesos } from '../../utils/money';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  transactionToEdit?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  transactionToEdit
}) => {
  const [type, setType] = useState<TransactionType>(transactionToEdit?.type ?? 'expense');
  const [amount, setAmount] = useState<number>(transactionToEdit?.amount ?? 0);
  const [accountId, setAccountId] = useState<string>(transactionToEdit?.accountId ?? accounts[0]?.id ?? '');
  const [destinationAccountId, setDestinationAccountId] = useState<string>(
    transactionToEdit?.destinationAccountId ?? (accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '')
  );
  const [category, setCategory] = useState<string>(transactionToEdit?.category ?? 'General');
  const [description, setDescription] = useState<string>(transactionToEdit?.description ?? '');
  const [notes, setNotes] = useState<string>(transactionToEdit?.notes ?? '');
  const [date, setDate] = useState<string>(
    transactionToEdit?.date ?? new Date().toISOString().split('T')[0]
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setError('Debés seleccionar una cuenta.');
      return;
    }

    if (amount <= 0) {
      setError('El importe debe ser mayor a 0 pesos.');
      return;
    }

    if (type === 'transfer' && (!destinationAccountId || destinationAccountId === accountId)) {
      setError('La cuenta de destino debe ser diferente a la de origen.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, {
          amount: Math.round(Number(amount)),
          date,
          accountId,
          destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
          category: category.trim(),
          description: description.trim() || getDefaultDescription(type),
          notes: notes.trim()
        });
      } else {
        await createTransaction({
          type,
          amount: Math.round(Number(amount)),
          date,
          accountId,
          destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
          category: category.trim(),
          description: description.trim() || getDefaultDescription(type),
          notes: notes.trim()
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el movimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefaultDescription = (t: TransactionType) => {
    switch (t) {
      case 'income':
        return 'Ingreso de dinero';
      case 'expense':
        return 'Gasto general';
      case 'transfer':
        return 'Transferencia interna';
      case 'adjustment':
        return 'Ajuste de saldo';
      default:
        return 'Movimiento';
    }
  };

  const getSuggestedCategories = () => {
    if (type === 'income') {
      return ['Honorarios', 'Sueldo', 'Venta Diaria', 'Cobro Extra', 'Otros Ingresos'];
    }
    if (type === 'expense') {
      return ['Alimentos', 'Transporte', 'Servicios', 'Salud', 'Hogar', 'Varios'];
    }
    if (type === 'transfer') {
      return ['Transferencia Interna'];
    }
    return ['Ajuste de Saldo'];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-4">
          {transactionToEdit ? 'Editar Movimiento' : 'Registrar Nuevo Movimiento'}
        </h3>

        {/* Selector de Tipo de Transacción */}
        {!transactionToEdit && (
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('Cobro Extra');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Ingreso</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory('Alimentos');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition ${
                type === 'expense'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setCategory('Transferencia Interna');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition ${
                type === 'transfer'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Transferir</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('adjustment');
                setCategory('Ajuste de Saldo');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition ${
                type === 'adjustment'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Ajuste</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Importe en Pesos (ARS sin decimales)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">$</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-xl font-bold font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Confirmado: {formatPesos(amount || 0)}
            </span>
          </div>

          {/* Cuentas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {type === 'transfer' ? 'Desde Cuenta (Origen)' : 'Cuenta'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatPesos(acc.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Hacia Cuenta (Destino)
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {accounts
                    .filter((acc) => acc.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatPesos(acc.currentBalance)})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Categoría y Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Categoría
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {getSuggestedCategories().map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    category === cat
                      ? 'bg-slate-800 border-slate-600 text-white font-medium'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="O escribe una categoría personalizada"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Concepto / Detalle
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Cobro de trabajo freelance, Supermercado..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Observaciones (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : transactionToEdit ? 'Actualizar' : 'Confirmar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
