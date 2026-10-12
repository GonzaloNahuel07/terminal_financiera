import React, { useState, useEffect } from 'react';
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

  // Sincronizar y recordar datos cuando se edita un movimiento
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount);
      setAccountId(transactionToEdit.accountId);
      setDestinationAccountId(
        transactionToEdit.destinationAccountId ??
          (accounts.find((a) => a.id !== transactionToEdit.accountId)?.id ?? '')
      );
      setCategory(transactionToEdit.category);
      setDescription(transactionToEdit.description);
      setNotes(transactionToEdit.notes ?? '');
      setDate(transactionToEdit.date);
    } else {
      setType('expense');
      setAmount(0);
      setAccountId(accounts[0]?.id ?? '');
      setDestinationAccountId(
        accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? ''
      );
      setCategory('General');
      setDescription('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setError(null);
  }, [transactionToEdit, isOpen, accounts]);

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
      return ['Honorarios', 'Sueldo', 'Venta Diaria', 'Cobro Extra', 'Otros'];
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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#141414] border border-[#282828] rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-fey-modal relative my-auto max-h-[92dvh] overflow-y-auto animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-fey-graphite hover:text-white p-1 rounded-full hover:bg-[#222222] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold tracking-fey-heading text-white mb-4">
          {transactionToEdit ? 'Editar Movimiento' : 'Registrar Nuevo Movimiento'}
        </h3>

        {/* Selector de Tipo de Transacción */}
        {!transactionToEdit && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#0b0b0b] rounded-xl mb-4 border border-[#242424]">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('Cobro Extra');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                type === 'income'
                  ? 'bg-[#1b2a22] text-fey-growth border border-[#2b4c38] shadow-fey-growth-glow'
                  : 'text-fey-graphite hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Ingreso</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory('Alimentos');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                type === 'expense'
                  ? 'bg-[#2a1414] text-fey-ember border border-[#441a1a]'
                  : 'text-fey-graphite hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setCategory('Transferencia Interna');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                type === 'transfer'
                  ? 'bg-[#152336] text-fey-signal border border-[#23426e]'
                  : 'text-fey-graphite hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Transferir</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('adjustment');
                setCategory('Ajuste de Saldo');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                type === 'adjustment'
                  ? 'bg-[#242014] text-amber-300 border border-[#42381b]'
                  : 'text-fey-graphite hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Ajuste</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-[#241414] border border-[#441a1a] rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
              Importe en Pesos (ARS sin decimales) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-fey-graphite font-bold font-mono">$</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl pl-8 pr-3.5 py-2.5 text-xl font-bold font-mono text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
              />
            </div>
            <span className="text-[11px] font-mono text-fey-graphite mt-1 block">
              Confirmado: {formatPesos(amount || 0)}
            </span>
          </div>

          {/* Cuentas y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                {type === 'transfer' ? 'Cuenta Origen' : 'Cuenta'} *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-fey-growth transition"
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
                <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                  Cuenta Destino *
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-fey-growth transition"
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
              <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-fey-growth transition [color-scheme:dark]"
                required
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
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
                      ? 'bg-[#191919] border-[#383838] text-white font-medium'
                      : 'bg-[#0b0b0b] border-[#242424] text-fey-graphite hover:border-[#333333]'
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
              className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
              Concepto / Detalle
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Cobro de trabajo freelance, Supermercado..."
              className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
              Observaciones (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
              className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222222]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-fey-graphite hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : transactionToEdit ? 'Actualizar' : 'Confirmar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
