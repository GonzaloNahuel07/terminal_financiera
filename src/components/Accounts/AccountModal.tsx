import React, { useState } from 'react';
import { X, Wallet, Landmark, Banknote } from 'lucide-react';
import type { Account, AccountType } from '../../types';
import { createAccount, updateAccount } from '../../services/accountService';
import { formatPesos } from '../../utils/money';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit
}) => {
  const [name, setName] = useState(accountToEdit?.name ?? '');
  const [type, setType] = useState<AccountType>(accountToEdit?.type ?? 'wallet');
  const [initialBalance, setInitialBalance] = useState<number>(accountToEdit?.initialBalance ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la cuenta es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (accountToEdit) {
        await updateAccount(accountToEdit.id, {
          name: name.trim(),
          type,
          initialBalance: Math.round(Number(initialBalance) || 0)
        });
      } else {
        await createAccount({
          name: name.trim(),
          type,
          initialBalance: Math.round(Number(initialBalance) || 0)
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-4">
          {accountToEdit ? 'Editar Cuenta' : 'Nueva Cuenta Financiera'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Nombre de la cuenta
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mercado Pago, Banco Galicia, Efectivo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Tipo de cuenta
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('wallet')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  type === 'wallet'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Wallet className="w-5 h-5 mb-1" />
                Billetera
              </button>

              <button
                type="button"
                onClick={() => setType('bank')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  type === 'bank'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Landmark className="w-5 h-5 mb-1" />
                Banco
              </button>

              <button
                type="button"
                onClick={() => setType('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  type === 'cash'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1" />
                Efectivo
              </button>
            </div>
          </div>

          {!accountToEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Saldo Inicial en Pesos (ARS)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={initialBalance || ''}
                onChange={(e) => setInitialBalance(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Equivalente: {formatPesos(initialBalance || 0)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
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
              {isSubmitting ? 'Guardando...' : accountToEdit ? 'Actualizar' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
