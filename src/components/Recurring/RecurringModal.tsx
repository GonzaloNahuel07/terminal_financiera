import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { RecurringObligation, RecurringFrequency } from '../../types';
import { createRecurringTemplate, updateRecurringTemplate } from '../../services/recurringService';
import { formatPesos } from '../../utils/money';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit?: RecurringObligation | null;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  templateToEdit
}) => {
  const [name, setName] = useState(templateToEdit?.name ?? '');
  const [expectedAmount, setExpectedAmount] = useState<number>(templateToEdit?.expectedAmount ?? 0);
  const [frequency, setFrequency] = useState<RecurringFrequency>(templateToEdit?.frequency ?? 'monthly');
  const [dueDay, setDueDay] = useState<number>(templateToEdit?.dueDay ?? 10);
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(templateToEdit?.priority ?? 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar y recordar datos cuando se edita un gasto recurrente
  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setExpectedAmount(templateToEdit.expectedAmount);
      setFrequency(templateToEdit.frequency);
      setDueDay(templateToEdit.dueDay);
      setPriority(templateToEdit.priority);
    } else {
      setName('');
      setExpectedAmount(0);
      setFrequency('monthly');
      setDueDay(10);
      setPriority(1);
    }
    setError(null);
  }, [templateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la obligación es obligatorio.');
      return;
    }
    if (expectedAmount <= 0) {
      setError('El importe estimado debe ser mayor a 0 pesos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (templateToEdit) {
        await updateRecurringTemplate(templateToEdit.id, {
          name: name.trim(),
          expectedAmount: Math.round(expectedAmount),
          frequency,
          dueDay: Math.min(31, Math.max(1, Math.round(dueDay))),
          priority
        });
      } else {
        await createRecurringTemplate({
          name: name.trim(),
          expectedAmount: Math.round(expectedAmount),
          frequency,
          dueDay: Math.min(31, Math.max(1, Math.round(dueDay))),
          priority
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la plantilla.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions = [
    { level: 1, label: '1 - Vital (Alquiler, Luz, Gas)' },
    { level: 2, label: '2 - Esencial (Internet, Celular)' },
    { level: 3, label: '3 - Importante (Transporte, Educación)' },
    { level: 4, label: '4 - Secundario (Gimnasio, Streaming)' },
    { level: 5, label: '5 - Prescindible / Ocio' }
  ];

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
          <div className="flex items-center gap-2 mb-1 text-fey-signal text-xs uppercase tracking-wider font-bold">
            <RefreshCw className="w-4 h-4" />
            Gastos Fijos y Periódicos
          </div>
          <h3 className="text-xl font-bold tracking-fey-heading text-white mb-3">
            {templateToEdit ? 'Editar Plantilla Recurrente' : 'Nueva Plantilla Periódica'}
          </h3>

          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
              Concepto / Nombre del Gasto
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Alquiler departamento, Edenor, Netflix..."
              className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Monto Estimado (ARS)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={expectedAmount || ''}
                onChange={(e) => setExpectedAmount(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-lg font-mono font-bold text-white placeholder-fey-smoke focus:outline-none focus:border-white transition"
              />
              <span className="text-[10px] text-fey-graphite mt-1 block">
                {formatPesos(expectedAmount || 0)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Día del Vencimiento (1 al 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                step="1"
                required
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-lg font-mono font-bold text-white focus:outline-none focus:border-white transition"
              />
              <span className="text-[10px] text-fey-graphite mt-1 block">
                Vence el día {dueDay} de cada ciclo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Periodicidad
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white transition"
              >
                <option value="monthly">Mensual</option>
                <option value="biweekly">Quincenal</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase tracking-wider mb-1.5">
                Nivel de Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) as 1 | 2 | 3 | 4 | 5)}
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white transition"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.level} value={opt.level}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : templateToEdit ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
