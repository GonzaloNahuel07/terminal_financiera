import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import type {
  Debt,
  RecurringObligation,
  SavingsGoal,
  VirtualReserve,
  AmountPesos,
  ReserveTargetType
} from '../../types';
import { allocateOrUpdateReserve } from '../../services/reserveService';
import { formatPesos } from '../../utils/money';

interface AllocateReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  debts: Debt[];
  recurring: RecurringObligation[];
  savingsGoals: SavingsGoal[];
  reserves: VirtualReserve[];
  freeBalance: AmountPesos;
  reserveToEdit?: VirtualReserve | null;
}

export const AllocateReserveModal: React.FC<AllocateReserveModalProps> = ({
  isOpen,
  onClose,
  debts,
  recurring,
  savingsGoals,
  reserves,
  freeBalance,
  reserveToEdit
}) => {
  if (!isOpen) return null;

  // Lista de objetivos disponibles
  const availableTargets = [
    ...debts
      .filter((d) => !d.isDeleted && d.status !== 'paid')
      .map((d) => {
        const existing = reserves.find((r) => r.targetId === d.id && r.status === 'active');
        return {
          type: 'debt' as ReserveTargetType,
          id: d.id,
          name: d.name,
          totalNeeded: d.remainingAmount,
          alreadyReserved: existing ? existing.amountReserved : 0
        };
      }),
    ...recurring
      .filter((r) => !r.isDeleted && r.isActive)
      .map((r) => {
        const existing = reserves.find((res) => res.targetId === r.id && res.status === 'active');
        return {
          type: 'recurring_obligation' as ReserveTargetType,
          id: r.id,
          name: r.name,
          totalNeeded: r.expectedAmount,
          alreadyReserved: existing ? existing.amountReserved : 0
        };
      }),
    ...savingsGoals
      .filter((g) => !g.isDeleted && g.status === 'in_progress')
      .map((g) => {
        const existing = reserves.find((res) => res.targetId === g.id && res.status === 'active');
        return {
          type: 'savings_goal' as ReserveTargetType,
          id: g.id,
          name: g.name,
          totalNeeded: g.targetAmount - g.currentAmount,
          alreadyReserved: existing ? existing.amountReserved : 0
        };
      })
  ];

  const defaultTarget = reserveToEdit
    ? availableTargets.find((t) => t.id === reserveToEdit.targetId) || availableTargets[0]
    : availableTargets[0];

  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    reserveToEdit ? reserveToEdit.targetId : (defaultTarget?.id ?? '')
  );

  const selectedTarget = availableTargets.find((t) => t.id === selectedTargetId) || defaultTarget;

  // Si se está editando una reserva existente, el saldo libre disponible se incrementa temporalmente por el monto previo
  const currentReservedForThis = reserveToEdit ? reserveToEdit.amountReserved : 0;
  const maxAvailableForThis = freeBalance + currentReservedForThis;

  const [amount, setAmount] = useState<number>(
    reserveToEdit ? reserveToEdit.amountReserved : Math.min(selectedTarget?.totalNeeded ?? 0, maxAvailableForThis)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar y recordar datos cuando se edita una reserva
  useEffect(() => {
    if (reserveToEdit) {
      setSelectedTargetId(reserveToEdit.targetId);
      setAmount(reserveToEdit.amountReserved);
    } else {
      setSelectedTargetId(defaultTarget?.id ?? '');
      setAmount(Math.min(defaultTarget?.totalNeeded ?? 0, maxAvailableForThis));
    }
    setError(null);
  }, [reserveToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) {
      setError('Debés seleccionar una obligación para reservar.');
      return;
    }
    if (amount <= 0) {
      setError('El monto a reservar debe ser mayor a 0 pesos.');
      return;
    }
    if (amount > maxAvailableForThis) {
      setError(`No podés reservar más dinero del saldo libre disponible (${formatPesos(maxAvailableForThis)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await allocateOrUpdateReserve({
        targetType: selectedTarget.type,
        targetId: selectedTarget.id,
        targetName: selectedTarget.name,
        amount: Math.round(Number(amount))
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const freeBalanceAfter = Math.max(0, maxAvailableForThis - (Math.round(amount) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#131313] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-fey-card text-white relative my-auto max-h-[92dvh] flex flex-col animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-fey-graphite hover:text-white p-1 rounded-full transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 mb-1 text-fey-growth text-xs uppercase tracking-wider font-bold">
            <ShieldAlert className="w-4 h-4" />
            Asignación Virtual
          </div>
          <h3 className="text-xl font-bold tracking-fey-heading text-white mb-1">
            {reserveToEdit ? 'Ajustar Reserva Virtual' : 'Apartar Dinero (Reserva)'}
          </h3>
          <p className="text-xs text-fey-graphite mb-3">
            Compromiso virtual • No mueve fondos bancarios reales
          </p>

          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Selector de Obligación */}
          {!reserveToEdit && (
            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Destino de la Reserva
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => {
                  setSelectedTargetId(e.target.value);
                  const target = availableTargets.find((t) => t.id === e.target.value);
                  if (target) {
                    setAmount(Math.min(target.totalNeeded, maxAvailableForThis));
                  }
                }}
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white transition"
                required
              >
                {availableTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.type === 'debt' ? 'Deuda' : t.type === 'recurring_obligation' ? 'Fijo' : 'Ahorro'}] {t.name} — Necesita: {formatPesos(t.totalNeeded)} (Ya reservado: {formatPesos(t.alreadyReserved)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Importe a Reservar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-fey-graphite uppercase tracking-wider">
                Monto a Reservar (ARS)
              </label>
              <span className="text-[11px] text-fey-growth font-mono font-bold">
                Máximo disponible: {formatPesos(maxAvailableForThis)}
              </span>
            </div>

            <input
              type="number"
              min="1"
              max={maxAvailableForThis}
              step="1"
              required
              value={amount || ''}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-2xl font-mono font-bold text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
            />

            {/* Accesos rápidos de porcentaje de cobertura */}
            <div className="flex gap-2 mt-2">
              {[0.25, 0.5, 1.0].map((pct) => {
                const targetNeeded = selectedTarget?.totalNeeded ?? 0;
                const calc = Math.min(Math.round(targetNeeded * pct), maxAvailableForThis);
                return (
                  <button
                    type="button"
                    key={pct}
                    onClick={() => setAmount(calc)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#191919] hover:bg-[#262626] text-fey-mist border border-[#2a2a2a] transition"
                  >
                    {pct * 100}% ({formatPesos(calc)})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Previsualización del Saldo Libre */}
          <div className="p-3 bg-[#0b0b0b] border border-[#222222] rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-fey-graphite">
              <span>Saldo libre antes:</span>
              <span className="font-mono">{formatPesos(maxAvailableForThis)}</span>
            </div>
            <div className="flex justify-between font-bold text-white pt-1 border-t border-[#1f1f1f]">
              <span className="flex items-center gap-1.5 text-fey-growth">
                <Sparkles className="w-3.5 h-3.5" />
                Saldo libre restante proyectado:
              </span>
              <span className="font-mono text-fey-growth">{formatPesos(freeBalanceAfter)}</span>
            </div>
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
              disabled={isSubmitting || amount <= 0 || amount > maxAvailableForThis}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : reserveToEdit ? 'Actualizar Reserva' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
