import React, { useState } from 'react';
import {
  X,
  Coins,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import type { Account, AmountPesos } from '../../types';
import { formatPesos } from '../../utils/money';
import {
  registerDailyIncome,
  applyConfirmedAllocations,
  type SuggestedAllocation
} from '../../services/incomeService';

interface DailyIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
}

export const DailyIncomeModal: React.FC<DailyIncomeModalProps> = ({
  isOpen,
  onClose,
  accounts
}) => {
  const [step, setStep] = useState<'input' | 'recommendations' | 'success'>('input');
  const [amount, setAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [origin, setOrigin] = useState<string>('Venta Diaria');
  const [customOrigin, setCustomOrigin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [suggestedAllocations, setSuggestedAllocations] = useState<SuggestedAllocation[]>([]);
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, AmountPesos>>({});
  const [freeBalanceAvailable, setFreeBalanceAvailable] = useState<AmountPesos>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickAmounts = [10000, 25000, 50000, 100000];
  const originPresets = [
    'Venta Diaria',
    'Trabajo Freelance',
    'Honorarios',
    'Cobro Cliente',
    'Comisión',
    'Otro'
  ];

  const handleRegisterIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('El importe cobrado debe ser mayor a 0 pesos.');
      return;
    }
    if (!accountId) {
      setError('Debés seleccionar la cuenta receptora.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const finalOrigin = origin === 'Otro' ? (customOrigin.trim() || 'Ingreso Extra') : origin;
      const result = await registerDailyIncome({
        amount: Math.round(Number(amount)),
        accountId,
        origin: finalOrigin,
        date,
        notes: notes.trim()
      });

      setFreeBalanceAvailable(result.freeBalanceAvailable);
      setSuggestedAllocations(result.suggestedAllocations);

      // Inicializar montos sugeridos editables
      const initialMap: Record<string, AmountPesos> = {};
      for (const item of result.suggestedAllocations) {
        initialMap[item.targetId] = item.suggestedAmount;
      }
      setAllocationAmounts(initialMap);

      if (result.suggestedAllocations.length > 0) {
        setStep('recommendations');
      } else {
        setStep('success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el cobro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyAllocations = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const toApply = suggestedAllocations.map((item) => ({
        targetType: item.targetType,
        targetId: item.targetId,
        name: item.name,
        amount: Math.round(Number(allocationAmounts[item.targetId]) || 0)
      })).filter((item) => item.amount > 0);

      if (toApply.length > 0) {
        await applyConfirmedAllocations(toApply);
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar reservas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('input');
    setAmount(0);
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-8">
        <button
          onClick={resetAndClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* PASO 1: Formulario de Cobro Diario */}
        {step === 'input' && (
          <div>
            <div className="flex items-center gap-2.5 mb-1 text-emerald-400 font-bold text-sm uppercase tracking-wider">
              <Coins className="w-4 h-4" />
              Ingreso Diario Variable
            </div>
            <h3 className="text-xl font-black text-white mb-4">
              Registrar Cobro de Hoy
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterIncome} className="space-y-4">
              {/* Importe Cobrado */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Importe cobrado en Pesos (ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-emerald-400 font-black text-lg">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-3 text-2xl font-black font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Botones de montos rápidos */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {quickAmounts.map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setAmount((prev) => prev + q)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
                    >
                      +{formatPesos(q)}
                    </button>
                  ))}
                  {amount > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(0)}
                      className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 transition"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Origen del Ingreso */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Origen / Concepto del Cobro
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {originPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setOrigin(preset)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition ${
                        origin === preset
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {origin === 'Otro' && (
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    placeholder="Escribe el origen del cobro..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 mt-2"
                    required
                  />
                )}
              </div>

              {/* Cuenta Receptora y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Cuenta receptora
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatPesos(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Fecha del cobro
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observaciones (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre el cliente, proyecto o trabajo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : 'Registrar y Analizar'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PASO 2: Recomendaciones Inteligentes del Asistente */}
        {step === 'recommendations' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Asistente Financiero
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">
                ¿Cómo distribuir el cobro de {formatPesos(amount)}?
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Libre: {formatPesos(freeBalanceAvailable)}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Analicé tus deudas y obligaciones próximas. Podés ajustar los montos sugeridos antes de confirmar las reservas.
            </p>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {suggestedAllocations.map((item) => (
                <div
                  key={item.targetId}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.name}</span>
                        {item.priorityLevel === 'urgente' && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            Urgente
                          </span>
                        )}
                        {item.priorityLevel === 'alta' && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Alta
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        {item.explanation}
                      </p>
                    </div>

                    <div className="w-32 flex-shrink-0 text-right">
                      <span className="text-[10px] text-slate-500 block mb-0.5">Reservar (ARS)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={allocationAmounts[item.targetId] ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setAllocationAmounts((prev) => ({
                            ...prev,
                            [item.targetId]: val
                          }));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-sm text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setStep('success')}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Omitir y dejar todo en Saldo Libre
              </button>

              <button
                type="button"
                onClick={handleApplyAllocations}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                Confirmar Reservas
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Confirmación y Éxito */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                ¡Ingreso Procesado con Éxito!
              </h3>
              <p className="text-sm text-slate-300 mt-1 max-w-sm mx-auto">
                Se registraron {formatPesos(amount)} en tu cuenta. Los saldos y reservas han sido actualizados en tiempo real.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={resetAndClose}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
              >
                Volver al Panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
