import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import type { Debt, DebtConsequence } from '../../types';
import { createDebt, updateDebt } from '../../services/debtService';
import { formatPesos } from '../../utils/money';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit?: Debt | null;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  debtToEdit
}) => {
  const [name, setName] = useState(debtToEdit?.name ?? '');
  const [creditor, setCreditor] = useState(debtToEdit?.creditor ?? '');
  const [totalAmount, setTotalAmount] = useState<number>(debtToEdit?.totalAmount ?? 0);
  const [minimumPayment, setMinimumPayment] = useState<number>(debtToEdit?.minimumPayment ?? 0);
  const [dueDate, setDueDate] = useState(debtToEdit?.dueDate ?? new Date().toISOString().split('T')[0]);
  const [consequenceType, setConsequenceType] = useState<DebtConsequence>(debtToEdit?.consequenceType ?? 'punitive_interest');
  const [interestRateKnown, setInterestRateKnown] = useState(debtToEdit?.interestRateKnown ?? '');
  const [notes, setNotes] = useState(debtToEdit?.notes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !creditor.trim()) {
      setError('El nombre y el acreedor son obligatorios.');
      return;
    }
    if (totalAmount <= 0) {
      setError('El monto total de la deuda debe ser mayor a 0 pesos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (debtToEdit) {
        await updateDebt(debtToEdit.id, {
          name: name.trim(),
          creditor: creditor.trim(),
          dueDate,
          minimumPayment: minimumPayment > 0 ? Math.round(minimumPayment) : undefined,
          consequenceType,
          interestRateKnown: interestRateKnown.trim() || undefined,
          notes: notes.trim() || undefined
        });
      } else {
        await createDebt({
          name: name.trim(),
          creditor: creditor.trim(),
          totalAmount: Math.round(totalAmount),
          minimumPayment: minimumPayment > 0 ? Math.round(minimumPayment) : undefined,
          dueDate,
          consequenceType,
          interestRateKnown: interestRateKnown.trim() || undefined,
          notes: notes.trim() || undefined
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la deuda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const consequences: { type: DebtConsequence; label: string; desc: string }[] = [
    {
      type: 'critical_cut',
      label: 'Corte de Servicio',
      desc: 'Suministros vitales (luz, gas, internet)'
    },
    {
      type: 'punitive_interest',
      label: 'Intereses Punitorios',
      desc: 'Tarjetas de crédito o recargos por mora'
    },
    {
      type: 'legal',
      label: 'Acción Legal',
      desc: 'Estudio de cobranza o vía judicial'
    },
    {
      type: 'mild',
      label: 'Consecuencia Leve',
      desc: 'Reprogramable con poco impacto'
    },
    {
      type: 'none',
      label: 'Sin Recargos',
      desc: 'Préstamos familiares o sin interés'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#131313] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 shadow-fey-card relative my-8 text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-fey-graphite hover:text-white p-1 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1 text-fey-ember text-xs uppercase tracking-wider font-bold">
          <ShieldAlert className="w-4 h-4" />
          Control de Pasivos
        </div>
        <h3 className="text-xl font-bold tracking-fey-heading text-white mb-4">
          {debtToEdit ? 'Editar Deuda' : 'Registrar Nueva Deuda'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Nombre de la Deuda
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Tarjeta Visa, Préstamo"
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Acreedor / Entidad
              </label>
              <input
                type="text"
                required
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                placeholder="Ej: Banco Santander, Edenor..."
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Monto Total (ARS sin decimales)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                disabled={Boolean(debtToEdit)}
                value={totalAmount || ''}
                onChange={(e) => setTotalAmount(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-white placeholder-fey-smoke focus:outline-none focus:border-white transition disabled:opacity-60"
              />
              <span className="text-[10px] text-fey-graphite mt-1 block">
                {formatPesos(totalAmount || 0)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Pago Mínimo o Cuota (Opcional)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minimumPayment || ''}
                onChange={(e) => setMinimumPayment(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
              />
              <span className="text-[10px] text-fey-graphite mt-1 block">
                {formatPesos(minimumPayment || 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Intereses Conocidos (Informativo)
              </label>
              <input
                type="text"
                value={interestRateKnown}
                onChange={(e) => setInterestRateKnown(e.target.value)}
                placeholder="Ej: 12% mensual, TNA 95%"
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          {/* Consecuencias del Impago (Pills Fey) */}
          <div>
            <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-2">
              Consecuencia en Caso de Impago (Clave para Priorización)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {consequences.map((c) => (
                <button
                  type="button"
                  key={c.type}
                  onClick={() => setConsequenceType(c.type)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    consequenceType === c.type
                      ? 'bg-[#191919] border-fey-ember text-white shadow-fey-ember-glow'
                      : 'bg-[#0b0b0b] border-[#222222] text-fey-graphite hover:border-[#333333]'
                  }`}
                >
                  <span className="text-xs font-bold block text-white">{c.label}</span>
                  <span className="text-[10px] text-fey-graphite block">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
              Observaciones / Condiciones
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Número de cliente, teléfono de contacto o condiciones..."
              className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2 text-sm text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222222]">
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
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : debtToEdit ? 'Actualizar Deuda' : 'Guardar Deuda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
