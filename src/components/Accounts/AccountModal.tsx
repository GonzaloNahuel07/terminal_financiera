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
      setError(err instanceof Error ? err.message : 'Error al guardar la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#141414] border border-[#282828] rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-fey-modal relative my-auto max-h-[92vh] overflow-y-auto animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-fey-graphite hover:text-white p-1 rounded-full hover:bg-[#222222] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold tracking-fey-heading text-white mb-4">
          {accountToEdit ? 'Editar Cuenta' : 'Nueva Cuenta Financiera'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-[#241414] border border-[#441a1a] rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
              Nombre de la cuenta *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mercado Pago, Banco Galicia, Efectivo"
              className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
              Tipo de cuenta
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('wallet')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  type === 'wallet'
                    ? 'bg-[#152336] border-[#23426e] text-fey-signal font-bold'
                    : 'bg-[#0b0b0b] border-[#242424] text-fey-graphite hover:border-[#383838]'
                }`}
              >
                <Wallet className="w-4 h-4 mb-1" />
                Billetera
              </button>

              <button
                type="button"
                onClick={() => setType('bank')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  type === 'bank'
                    ? 'bg-[#1b2535] border-[#2b3c59] text-blue-400 font-bold'
                    : 'bg-[#0b0b0b] border-[#242424] text-fey-graphite hover:border-[#383838]'
                }`}
              >
                <Landmark className="w-4 h-4 mb-1" />
                Banco
              </button>

              <button
                type="button"
                onClick={() => setType('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  type === 'cash'
                    ? 'bg-[#1b2a22] border-[#2b4c38] text-fey-growth font-bold'
                    : 'bg-[#0b0b0b] border-[#242424] text-fey-graphite hover:border-[#383838]'
                }`}
              >
                <Banknote className="w-4 h-4 mb-1" />
                Efectivo
              </button>
            </div>
          </div>

          {!accountToEdit && (
            <div>
              <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                Saldo Inicial en Pesos (ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-fey-graphite font-mono">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={initialBalance || ''}
                  onChange={(e) => setInitialBalance(parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white placeholder-fey-graphite font-mono focus:outline-none focus:border-fey-growth transition"
                />
              </div>
              <span className="text-[11px] font-mono text-fey-graphite mt-1 block">
                Equivalente: {formatPesos(initialBalance || 0)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#222222]">
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
              className="px-5 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : accountToEdit ? 'Actualizar' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
