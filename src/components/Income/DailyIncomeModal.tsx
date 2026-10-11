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

      const finalOrigin = origin === 'Otro' ? customOrigin.trim() || 'Otro ingreso' : origin;
      const result = await registerDailyIncome({
        amount,
        accountId,
        origin: finalOrigin,
        date,
        notes: notes.trim() || undefined
      });

      setSuggestedAllocations(result.suggestedAllocations);
      setFreeBalanceAvailable(result.freeBalanceAvailable);

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
      setError(err instanceof Error ? err.message : 'Error al registrar cobro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyAllocations = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const confirmedItems = suggestedAllocations
        .map((item) => ({
          targetType: item.targetType,
          targetId: item.targetId,
          name: item.name,
          amount: allocationAmounts[item.targetId] ?? item.suggestedAmount
        }))
        .filter((item) => item.amount > 0);

      await applyConfirmedAllocations(confirmedItems);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#141414] border border-[#282828] rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-fey-modal relative my-auto max-h-[92vh] overflow-y-auto animate-in fade-in duration-200">
        <button
          onClick={resetAndClose}
          className="absolute top-4 right-4 text-fey-graphite hover:text-white p-1 rounded-full hover:bg-[#222222] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* PASO 1: Formulario de Cobro Diario */}
        {step === 'input' && (
          <div>
            <div className="flex items-center gap-2.5 mb-1 text-fey-growth font-bold text-xs uppercase tracking-wider">
              <Coins className="w-4 h-4" />
              Ingreso Diario Variable
            </div>
            <h3 className="text-xl font-bold tracking-fey-heading text-white mb-4">
              Registrar Cobro de Hoy.
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-[#241414] border border-[#441a1a] rounded-xl text-red-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterIncome} className="space-y-4">
              {/* Importe Cobrado */}
              <div>
                <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                  Importe cobrado en Pesos (ARS) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-fey-growth font-bold text-xl">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    autoFocus
                    value={amount || ''}
                    onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl pl-9 pr-3.5 py-2.5 text-2xl font-mono font-bold text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
                  />
                </div>

                {/* Botones de montos rápidos */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickAmounts.map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setAmount((prev) => prev + q)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1a1a1a] hover:bg-[#242424] text-fey-growth border border-[#2a2a2a] transition active:scale-95"
                    >
                      +{formatPesos(q)}
                    </button>
                  ))}
                  {amount > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(0)}
                      className="px-2.5 py-1 rounded-lg text-xs text-fey-graphite hover:text-white transition"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Origen del Ingreso */}
              <div>
                <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                  Origen / Concepto del Cobro
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                  {originPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setOrigin(preset)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition ${
                        origin === preset
                          ? 'bg-[#1b2a22] border-[#2b4c38] text-fey-growth font-bold shadow-fey-growth-glow'
                          : 'bg-[#0b0b0b] border-[#282828] text-fey-graphite hover:border-[#383838]'
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
                    className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-sm text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth mt-2"
                    required
                  />
                )}
              </div>

              {/* Cuenta Receptora y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                    Cuenta receptora
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

                <div>
                  <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                    Fecha del cobro
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fey-growth transition [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                  Observaciones (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre el cliente, proyecto o trabajo..."
                  className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-4 py-2 text-xs font-semibold text-fey-graphite hover:text-white rounded-full transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? 'Procesando...' : 'Registrar y Analizar'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PASO 2: Recomendaciones Inteligentes del Asistente */}
        {step === 'recommendations' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-fey-growth font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Asistente Financiero
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-fey-heading">
                ¿Cómo distribuir {formatPesos(amount)}?
              </h3>
              <span className="text-xs font-mono font-bold text-fey-growth bg-[#1b2a22] px-2.5 py-0.5 rounded-full border border-[#2b4c38]">
                Libre: {formatPesos(freeBalanceAvailable)}
              </span>
            </div>

            <p className="text-xs text-fey-graphite">
              Analicé tus deudas y obligaciones próximas. Podés ajustar los montos sugeridos antes de confirmar las reservas.
            </p>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {suggestedAllocations.map((item) => (
                <div
                  key={item.targetId}
                  className="p-3.5 bg-[#0b0b0b] border border-[#242424] rounded-xl space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{item.name}</span>
                        {item.priorityLevel === 'urgente' && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#2a1414] text-fey-ember border border-[#441a1a]">
                            Urgente
                          </span>
                        )}
                        {item.priorityLevel === 'alta' && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#201712] text-amber-300 border border-[#3b2315]">
                            Alta
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-fey-graphite mt-1 flex items-start gap-1">
                        <Info className="w-3.5 h-3.5 text-fey-smoke shrink-0 mt-0.5" />
                        {item.explanation}
                      </p>
                    </div>

                    <div className="sm:w-32 shrink-0 sm:text-right">
                      <span className="text-[10px] text-fey-smoke block mb-0.5">Reservar (ARS)</span>
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
                        className="w-full bg-[#141414] border border-[#2c2c2c] rounded-lg px-2.5 py-1.5 sm:text-right font-mono font-bold text-xs text-fey-growth focus:outline-none focus:border-fey-growth transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setStep('success')}
                className="text-xs text-fey-graphite hover:text-white transition py-1"
              >
                Omitir y dejar todo en Saldo Libre
              </button>

              <button
                type="button"
                onClick={handleApplyAllocations}
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Confirmar Reservas
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Confirmación y Éxito */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-[#1b2a22] border border-[#2b4c38] rounded-full flex items-center justify-center mx-auto text-fey-growth shadow-fey-growth-glow">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold tracking-fey-heading text-white">
                ¡Ingreso Procesado con Éxito!
              </h3>
              <p className="text-xs text-fey-graphite mt-1 max-w-sm mx-auto">
                Se registraron {formatPesos(amount)} en tu cuenta. Los saldos y reservas han sido actualizados en tiempo real.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="w-full sm:w-auto px-8 py-2.5 rounded-full font-bold text-xs bg-white text-black hover:bg-fey-pale transition shadow-fey-button"
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
