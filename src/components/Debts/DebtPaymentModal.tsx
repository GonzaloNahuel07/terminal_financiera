import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import type { Debt, Account } from '../../types';
import { recordDebtPayment } from '../../services/debtService';
import { formatPesos } from '../../utils/money';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  accounts: Account[];
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  accounts
}) => {
  if (!isOpen || !debt) return null;

  const [paymentAmount, setPaymentAmount] = useState<number>(debt.remainingAmount);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setError('Debés seleccionar la cuenta de pago.');
      return;
    }
    if (paymentAmount <= 0) {
      setError('El importe a pagar debe ser mayor a 0 pesos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await recordDebtPayment({
        debtId: debt.id,
        accountId,
        paymentAmount: Math.round(Number(paymentAmount)),
        date,
        notes: notes.trim() || undefined
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAfter = Math.max(0, debt.remainingAmount - (Math.round(paymentAmount) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#131313] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-fey-card relative my-auto max-h-[92dvh] flex flex-col text-white animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-fey-graphite hover:text-white p-1 rounded-full transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-shrink-0">
          <h3 className="text-lg font-bold tracking-fey-heading text-white mb-1">
            Confirmar Pago de Deuda
          </h3>
          <p className="text-xs text-fey-graphite mb-3">
            {debt.name} • {debt.creditor}
          </p>

          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Opciones Rápidas de Pago */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentAmount(debt.remainingAmount)}
              className={`p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                paymentAmount === debt.remainingAmount
                  ? 'bg-[#191919] border-white text-white'
                  : 'bg-[#0b0b0b] border-[#222222] text-fey-graphite hover:border-[#333333]'
              }`}
            >
              <span className="block text-[10px] text-fey-graphite">Pago Total</span>
              <span className="font-mono font-bold text-white">{formatPesos(debt.remainingAmount)}</span>
            </button>

            {debt.minimumPayment && debt.minimumPayment > 0 && debt.minimumPayment < debt.remainingAmount && (
              <button
                type="button"
                onClick={() => setPaymentAmount(debt.minimumPayment!)}
                className={`p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                  paymentAmount === debt.minimumPayment
                    ? 'bg-[#191919] border-white text-white'
                    : 'bg-[#0b0b0b] border-[#222222] text-fey-graphite hover:border-[#333333]'
                }`}
              >
                <span className="block text-[10px] text-fey-graphite">Pago Mínimo / Cuota</span>
                <span className="font-mono font-bold text-white">{formatPesos(debt.minimumPayment)}</span>
              </button>
            )}
          </div>

          {/* Importe */}
          <div>
            <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
              Importe a Pagar (ARS)
            </label>
            <input
              type="number"
              min="1"
              max={debt.remainingAmount}
              step="1"
              required
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xl font-mono font-bold text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
            />
            <div className="flex items-center justify-between text-[11px] text-fey-graphite mt-1.5">
              <span>Saldo después del pago:</span>
              <span className="font-mono font-bold text-fey-mist">{formatPesos(remainingAfter)}</span>
            </div>
          </div>

          {/* Cuenta de débito */}
          <div>
            <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
              Pagar desde Cuenta
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white transition"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — Disponible: {formatPesos(acc.currentBalance)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
              Fecha de Confirmación
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
              Comprobante / Observaciones
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Número de comprobante, transferencia..."
              className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2 text-xs text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
            />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222222] flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-fey-graphite hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
