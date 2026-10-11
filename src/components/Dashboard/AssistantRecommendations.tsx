import React from 'react';
import {
  Sparkles,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import type { Debt, RecurringObligation, SavingsGoal, AmountPesos } from '../../types';
import { formatPesos } from '../../utils/money';
import { prioritizeObligations } from '../../core/debts';

interface AssistantRecommendationsProps {
  freeBalance: AmountPesos;
  totalRealBalance: AmountPesos;
  debts: Debt[];
  recurring: RecurringObligation[];
  savingsGoals: SavingsGoal[];
  onOpenIncomeModal: () => void;
}

export const AssistantRecommendations: React.FC<AssistantRecommendationsProps> = ({
  freeBalance,
  totalRealBalance,
  debts,
  recurring,
  savingsGoals,
  onOpenIncomeModal
}) => {
  const today = new Date().toISOString().split('T')[0];
  const prioritized = prioritizeObligations({
    debts,
    recurring,
    savingsGoals,
    currentDate: today
  });

  const urgentItems = prioritized.filter((p) => p.priorityLevel === 'urgente' || p.priorityLevel === 'alta');
  const emergencyGoal = savingsGoals.find((g) => g.isEmergencyFund && !g.isDeleted);
  const emergencyPct = emergencyGoal
    ? Math.round((emergencyGoal.currentAmount / emergencyGoal.targetAmount) * 100)
    : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-800/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-4">
      {/* Encabezado con estado del Asistente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">
              Recomendaciones del Asistente Financiero
            </h3>
            <p className="text-xs text-slate-400">
              Análisis dinámico de liquidez y compromisos para hoy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            Saldo Real: {formatPesos(totalRealBalance)}
          </span>
          <span className="self-start sm:self-auto text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            ● Asistente Activo
          </span>
        </div>
      </div>

      {/* Alerta de Urgencias si existen deudas próximas o vencidas */}
      {urgentItems.length > 0 ? (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wide">
            <AlertCircle className="w-4 h-4" />
            Acción Inmediata Requerida ({urgentItems.length} obligaciones críticas)
          </div>

          <div className="space-y-1.5">
            {urgentItems.slice(0, 2).map((item) => (
              <div key={item.id} className="flex items-start justify-between text-xs">
                <span className="text-slate-200 font-semibold">{item.name}</span>
                <div className="text-right">
                  <span className="text-red-400 font-mono font-bold block">
                    {formatPesos(item.amountRequired)}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.explanation}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-red-300/80 pt-1 border-t border-red-500/20">
            {freeBalance >= urgentItems[0].amountRequired
              ? `Tenés saldo libre suficiente (${formatPesos(freeBalance)}) para apartar esta reserva ahora mismo.`
              : `Tu saldo libre actual (${formatPesos(freeBalance)}) es inferior a estas obligaciones. Priorizá cualquier nuevo ingreso hacia estos pagos.`}
          </p>
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-emerald-300 block">
              ¡Sin urgencias inminentes registradas!
            </span>
            <span className="text-slate-300">
              Todas las obligaciones críticas conocidas están cubiertas o reservadas.
            </span>
          </div>
        </div>
      )}

      {/* Grid de Métricas y Recomendaciones para Hoy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Recomendación de Gasto Libre Seguro */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Margen de Gasto Diario
            </span>
            <span className="font-mono text-white font-bold">
              {formatPesos(Math.max(0, Math.round(freeBalance / 7)))} / día
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sugerencia calculada dividiendo tu Saldo Libre ({formatPesos(freeBalance)}) entre los próximos 7 días para no desfinanciar la semana.
          </p>
        </div>

        {/* Recomendación Fondo de Contingencia */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Fondo de Emergencia
            </span>
            <span className="font-mono text-amber-400 font-bold">
              {emergencyPct}% completado
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {emergencyPct < 50
              ? 'Cobertura inicial baja. Es aconsejable reservar al menos un 15% de cada cobro diario variable.'
              : 'Buen colchón de contingencia. Podés canalizar excedentes a metas secundarias.'}
          </p>
        </div>
      </div>

      {/* Llamada a la acción rápida */}
      <div className="flex items-center justify-between pt-2 text-xs">
        <span className="text-slate-400">¿Recibiste un cobro hoy?</span>
        <button
          onClick={onOpenIncomeModal}
          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold hover:underline transition"
        >
          <span>Registrar cobro variable</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
