import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Target, Sparkles } from 'lucide-react';
import type { SavingsGoal } from '../../types';
import { createSavingsGoal, updateSavingsGoal } from '../../services/savingsService';
import { formatPesos } from '../../utils/money';

interface SavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: SavingsGoal | null;
}

export const SavingsModal: React.FC<SavingsModalProps> = ({
  isOpen,
  onClose,
  goalToEdit
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [isEmergencyFund, setIsEmergencyFund] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goalToEdit) {
      setName(goalToEdit.name);
      setTargetAmount(goalToEdit.targetAmount);
      setTargetDate(goalToEdit.targetDate ?? '');
      setPriority(goalToEdit.priority);
      setIsEmergencyFund(goalToEdit.isEmergencyFund);
    } else {
      setName('');
      setTargetAmount(0);
      setTargetDate('');
      setPriority(3);
      setIsEmergencyFund(false);
    }
    setError(null);
  }, [goalToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresá un nombre descriptivo para la meta.');
      return;
    }
    if (targetAmount <= 0) {
      setError('El monto objetivo debe ser mayor a 0 pesos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (goalToEdit) {
        await updateSavingsGoal(goalToEdit.id, {
          name: name.trim(),
          targetAmount: Math.round(targetAmount),
          targetDate: targetDate.trim() || undefined,
          priority
        });
      } else {
        await createSavingsGoal({
          name: name.trim(),
          targetAmount: Math.round(targetAmount),
          targetDate: targetDate.trim() || undefined,
          priority: isEmergencyFund ? 1 : priority,
          isEmergencyFund
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la meta de ahorro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#141414] border border-[#282828] w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-fey-modal relative my-auto max-h-[92dvh] flex flex-col text-white animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1b2a22] border border-[#2b4c38] flex items-center justify-center text-fey-growth">
              {isEmergencyFund ? <ShieldCheck className="w-5 h-5" /> : <Target className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-fey-heading text-white">
                {goalToEdit ? 'Editar Meta de Ahorro' : 'Nuevo Objetivo de Ahorro'}
              </h3>
              <p className="text-xs text-fey-graphite">
                {isEmergencyFund ? 'Colchón financiero de seguridad' : 'Define tu meta con plazo y prioridad'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-fey-graphite hover:text-white rounded-full hover:bg-[#222222] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[#241414] border border-[#441a1a] rounded-xl text-xs text-red-300 mb-3 flex-shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
              Nombre de la Meta *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Vacaciones 2026, Fondo de Emergencia, Cambio de celular"
              className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
            />
          </div>

          {/* Monto Objetivo */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-fey-mist uppercase tracking-wider">
                Monto Objetivo (ARS) *
              </label>
              <span className="text-xs font-mono text-fey-growth">
                {targetAmount > 0 ? formatPesos(targetAmount) : '$0'}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-fey-graphite font-mono">$</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={targetAmount || ''}
                onChange={(e) => setTargetAmount(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
              />
            </div>
            <p className="text-[10px] text-fey-graphite mt-1">
              Entero exacto en pesos argentinos. Sin centavos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fecha Límite */}
            <div>
              <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                Fecha Estimada (Opcional)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fey-growth transition [color-scheme:dark]"
              />
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                Prioridad de Asignación
              </label>
              <select
                value={priority}
                disabled={isEmergencyFund}
                onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-fey-growth transition disabled:opacity-50"
              >
                <option value={1}>1 - Máxima (Crítica / Urgente)</option>
                <option value={2}>2 - Alta</option>
                <option value={3}>3 - Media (Estándar)</option>
                <option value={4}>4 - Baja</option>
                <option value={5}>5 - Opcional / Deseable</option>
              </select>
            </div>
          </div>

          {/* Toggle Fondo de Emergencia (solo para nuevas metas) */}
          {!goalToEdit && (
            <label className="flex items-start gap-3 p-3 bg-[#0b0b0b] border border-[#282828] rounded-xl cursor-pointer hover:border-[#383838] transition">
              <input
                type="checkbox"
                checked={isEmergencyFund}
                onChange={(e) => {
                  setIsEmergencyFund(e.target.checked);
                  if (e.target.checked) setPriority(1);
                }}
                className="mt-0.5 rounded border-[#383838] text-fey-growth focus:ring-fey-growth"
              />
              <div className="text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-fey-growth" />
                  Marcar como Fondo de Emergencia
                </span>
                <span className="text-fey-graphite block mt-0.5">
                  Tendrá prioridad #1 automática en el asistente financiero para proteger tus imprevistos.
                </span>
              </div>
            </label>
          )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222222] flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-fey-graphite hover:text-white rounded-full transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : goalToEdit ? 'Actualizar Meta' : 'Crear Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
