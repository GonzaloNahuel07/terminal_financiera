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
    <div className="bg-[#191919] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-fey-card relative overflow-hidden space-y-4 fey-halo-hover">
      {/* Encabezado Fey con estado del Asistente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-[#131313] border border-[#2a2a2a] text-fey-ember shadow-fey-button">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-fey-heading text-white">
              Recomendaciones del Asistente
            </h3>
            <p className="text-xs text-fey-graphite">
              Análisis predictivo de liquidez y pasivos para hoy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-fey-mist bg-[#0b0b0b] px-2.5 py-1 rounded-full border border-[#222222]">
            Saldo Real: {formatPesos(totalRealBalance)}
          </span>
          <span className="text-[11px] font-bold text-fey-growth bg-fey-growth/10 px-2.5 py-1 rounded-full border border-fey-growth/30 shadow-fey-growth-glow">
            ● Activo
          </span>
        </div>
      </div>

      {/* Alerta de Urgencias si existen deudas críticas */}
      {urgentItems.length > 0 ? (
        <div className="p-4 bg-[#131313] border border-fey-ember/30 rounded-xl space-y-2.5 shadow-fey-ember-glow">
          <div className="flex items-center gap-2 text-fey-ember font-bold text-xs uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            Atención Inmediata ({urgentItems.length} obligaciones críticas detectadas)
          </div>

          <div className="space-y-2">
            {urgentItems.slice(0, 2).map((item) => (
              <div key={item.id} className="flex items-start justify-between text-xs">
                <span className="text-white font-medium">{item.name}</span>
                <div className="text-right">
                  <span className="text-fey-ember font-mono font-bold block">
                    {formatPesos(item.amountRequired)}
                  </span>
                  <span className="text-[10px] text-fey-graphite">{item.explanation}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-fey-mist pt-1.5 border-t border-[#262626]">
            {freeBalance >= urgentItems[0].amountRequired
              ? `Disponés de saldo libre (${formatPesos(freeBalance)}) para apartar esta reserva de forma segura.`
              : `Tu saldo libre (${formatPesos(freeBalance)}) es inferior a estas obligaciones. Priorizá cualquier nuevo cobro diario.`}
          </p>
        </div>
      ) : (
        <div className="p-4 bg-[#131313] border border-[#262626] rounded-xl flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-fey-growth flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white block">
              Sin compromisos críticos inmediatos.
            </span>
            <span className="text-fey-graphite">
              Las obligaciones conocidas están al día o cubiertas por reservas previas.
            </span>
          </div>
        </div>
      )}

      {/* Grid de Métricas y Recomendaciones para Hoy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Recomendación de Gasto Libre Seguro */}
        <div className="p-3.5 bg-[#131313] border border-[#262626] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-fey-graphite">
            <span className="font-medium flex items-center gap-1.5 text-white">
              <TrendingUp className="w-3.5 h-3.5 text-fey-signal" />
              Margen de Gasto Diario
            </span>
            <span className="font-mono text-white font-bold">
              {formatPesos(Math.max(0, Math.round(freeBalance / 7)))} / día
            </span>
          </div>
          <p className="text-[11px] text-fey-graphite leading-relaxed">
            Presupuesto diario seguro dividiendo tu Saldo Libre ({formatPesos(freeBalance)}) en los próximos 7 días.
          </p>
        </div>

        {/* Recomendación Fondo de Contingencia */}
        <div className="p-3.5 bg-[#131313] border border-[#262626] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-fey-graphite">
            <span className="font-medium flex items-center gap-1.5 text-white">
              <Clock className="w-3.5 h-3.5 text-fey-ember" />
              Fondo de Emergencia
            </span>
            <span className="font-mono text-fey-ember font-bold">
              {emergencyPct}% acumulado
            </span>
          </div>
          <p className="text-[11px] text-fey-graphite leading-relaxed">
            {emergencyPct < 50
              ? 'Cobertura inicial baja. Es aconsejable reservar al menos 15% de cada cobro diario.'
              : 'Buen colchón de contingencia acumulado para amortiguar imprevistos.'}
          </p>
        </div>
      </div>

      {/* Pie interactivo */}
      <div className="flex items-center justify-between pt-2 text-xs">
        <span className="text-fey-graphite">¿Tuviste ingresos hoy?</span>
        <button
          onClick={onOpenIncomeModal}
          className="inline-flex items-center gap-1.5 text-white hover:text-fey-mist font-bold transition group"
        >
          <span>Registrar cobro variable</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
