import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Sparkles } from 'lucide-react';
import type { WeeklyPlan } from '../../types';
import { createWeeklyPlan, updateWeeklyPlan, getCurrentWeekRange } from '../../services/weeklyPlanService';
import { formatPesos } from '../../utils/money';

interface WeeklyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planToEdit?: WeeklyPlan | null;
}

export const WeeklyPlanModal: React.FC<WeeklyPlanModalProps> = ({
  isOpen,
  onClose,
  planToEdit
}) => {
  const defaultRange = getCurrentWeekRange();
  const [startDate, setStartDate] = useState(planToEdit?.weekStartDate ?? defaultRange.start);
  const [endDate, setEndDate] = useState(planToEdit?.weekEndDate ?? defaultRange.end);
  const [expectedIncome, setExpectedIncome] = useState<number>(planToEdit?.expectedIncome ?? 0);
  const [notes, setNotes] = useState(planToEdit?.notes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planToEdit) {
      setStartDate(planToEdit.weekStartDate);
      setEndDate(planToEdit.weekEndDate);
      setExpectedIncome(planToEdit.expectedIncome);
      setNotes(planToEdit.notes ?? '');
    } else {
      const range = getCurrentWeekRange();
      setStartDate(range.start);
      setEndDate(range.end);
      setExpectedIncome(0);
      setNotes('');
    }
    setError(null);
  }, [planToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expectedIncome < 0) {
      setError('El ingreso estimado no puede ser negativo.');
      return;
    }
    if (startDate > endDate) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (planToEdit) {
        await updateWeeklyPlan(planToEdit.id, {
          expectedIncome: Math.round(expectedIncome),
          notes: notes.trim() || undefined
        });
      } else {
        await createWeeklyPlan({
          weekStartDate: startDate,
          weekEndDate: endDate,
          expectedIncome: Math.round(expectedIncome),
          notes: notes.trim() || undefined
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el plan semanal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[#282828] w-full max-w-md rounded-2xl p-6 shadow-fey-modal space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1b2535] border border-[#2c3d59] flex items-center justify-center text-fey-signal">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-fey-heading text-white">
                {planToEdit ? 'Ajustar Plan Semanal' : 'Nuevo Plan Semanal'}
              </h3>
              <p className="text-xs text-fey-graphite">
                Estimación de ingresos variables y obligaciones del ciclo
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
          <div className="p-3 bg-[#241414] border border-[#441a1a] rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rango de fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                Inicio (Lunes)
              </label>
              <input
                type="date"
                required
                disabled={Boolean(planToEdit)}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fey-signal transition disabled:opacity-50 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                Fin (Domingo)
              </label>
              <input
                type="date"
                required
                disabled={Boolean(planToEdit)}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fey-signal transition disabled:opacity-50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Ingreso proyectado */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-fey-mist uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-fey-signal" />
                Ingreso Estimado de la Semana *
              </label>
              <span className="text-xs font-mono text-fey-signal font-bold">
                {expectedIncome > 0 ? formatPesos(expectedIncome) : '$0'}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-fey-graphite font-mono">$</span>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={expectedIncome || ''}
                onChange={(e) => setExpectedIncome(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-fey-graphite focus:outline-none focus:border-fey-signal transition"
              />
            </div>
            <p className="text-[10px] text-fey-graphite mt-1">
              Proyección conservadora de lo que esperás cobrar en estos 7 días.
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
              Notas u Objetivos de la Semana
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Semana con cobro de trabajo freelance grande; priorizar pago de luz el miércoles."
              className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white placeholder-fey-graphite focus:outline-none focus:border-fey-signal transition resize-none"
            />
          </div>

          {/* Banner explicativo */}
          <div className="p-3 bg-[#0b0b0b] rounded-xl border border-[#222222] text-[11px] text-fey-graphite flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-fey-signal shrink-0 mt-0.5" />
            <span>
              Regla de oro: El ingreso proyectado solo sirve de guía de planificación. El asistente nunca lo considerará saldo real hasta que registres cada cobro.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#222222]">
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
              {isSubmitting ? 'Guardando...' : planToEdit ? 'Actualizar Plan' : 'Crear Plan Semanal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
