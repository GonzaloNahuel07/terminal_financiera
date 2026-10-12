import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Archive,
  Edit2
} from 'lucide-react';
import type { WeeklyPlan, Debt, RecurringObligation } from '../../types';
import { formatPesos } from '../../utils/money';
import {
  closeWeeklyPlan,
  getOrCreateCurrentWeeklyPlan,
  getCurrentWeekRange
} from '../../services/weeklyPlanService';
import { analyzeWeeklyPlan } from '../../core/weeklyPlan';
import { WeeklyPlanModal } from './WeeklyPlanModal';

interface WeeklyPlanViewProps {
  weeklyPlans: WeeklyPlan[];
  debts: Debt[];
  recurring: RecurringObligation[];
}

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({
  weeklyPlans,
  debts,
  recurring
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<WeeklyPlan | null>(null);

  // Modal para cerrar semana
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);

  const activePlan = weeklyPlans.find((p) => p.status === 'active');
  const closedPlans = weeklyPlans
    .filter((p) => p.status === 'closed')
    .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));

  // Filtrar obligaciones comprendidas en la semana activa
  const obligationsInWeek: (RecurringObligation | Debt)[] = [];
  if (activePlan) {
    const { weekStartDate, weekEndDate } = activePlan;

    // Deudas que vencen en la semana
    const matchingDebts = debts.filter(
      (d) => !d.isDeleted && d.status !== 'paid' && d.dueDate >= weekStartDate && d.dueDate <= weekEndDate
    );
    obligationsInWeek.push(...matchingDebts);

    // Recurrentes comprendidos en la semana
    const startDay = parseInt(weekStartDate.slice(8), 10);
    const endDay = parseInt(weekEndDate.slice(8), 10);
    const sameMonth = weekStartDate.slice(5, 7) === weekEndDate.slice(5, 7);

    const matchingRecurring = recurring.filter((r) => {
      if (r.isDeleted || !r.isActive) return false;
      if (r.frequency === 'weekly' || r.frequency === 'biweekly') return true;
      if (sameMonth) {
        return r.dueDay >= startDay && r.dueDay <= endDay;
      }
      return r.dueDay >= startDay || r.dueDay <= endDay;
    });
    obligationsInWeek.push(...matchingRecurring);
  }

  // Análisis profundo de la semana activa
  const analysis = activePlan
    ? analyzeWeeklyPlan({
        plan: activePlan,
        actualCollectedIncome: activePlan.actualIncome,
        obligationsForWeek: obligationsInWeek
      })
    : null;

  // Cálculo de avance de días en la semana (1 a 7)
  const currentWeekRange = getCurrentWeekRange();
  const todayStr = new Date().toISOString().split('T')[0];
  let daysPassedInWeek = 1;
  if (activePlan) {
    const startMs = new Date(activePlan.weekStartDate).getTime();
    const todayMs = new Date(todayStr).getTime();
    const diffDays = Math.max(0, Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24))) + 1;
    daysPassedInWeek = Math.min(7, Math.max(1, diffDays));
  }
  const weekTimeProgressPct = Math.round((daysPassedInWeek / 7) * 100);

  const handleCloseWeekSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan) return;

    try {
      setIsClosingSubmitting(true);
      await closeWeeklyPlan(activePlan.id, closingNotes);
      setIsClosingModalOpen(false);
      setClosingNotes('');
    } finally {
      setIsClosingSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-fey-signal text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            Ciclos de Planificación
          </div>
          <h2 className="text-2xl font-bold tracking-fey-display text-white">
            Plan Semanal y Cierre de Ciclos.
          </h2>
          <p className="text-xs text-fey-graphite">
            Previsión de ingresos variables, obligaciones y ritmo de cobertura de 7 días
          </p>
        </div>

        <button
          onClick={() => {
            setPlanToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Plan Semanal
        </button>
      </div>

      {/* 1. HERO CARD: SEMANA EN CURSO */}
      {activePlan && analysis ? (
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-6 shadow-fey-card space-y-6 fey-halo-hover">
          {/* Header de la tarjeta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#152336] border border-[#23426e] text-fey-signal">
                  Semana Activa
                </span>
                <span className="text-xs text-fey-graphite font-mono">
                  {activePlan.weekStartDate} al {activePlan.weekEndDate}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-fey-heading">
                Semana en Curso: Día {daysPassedInWeek} de 7
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPlanToEdit(activePlan);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1a1a1a] hover:bg-[#242424] text-fey-mist hover:text-white border border-[#2a2a2a] transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Ajustar Estimación
              </button>

              <button
                onClick={() => {
                  setClosingNotes('');
                  setIsClosingModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Cerrar Semana
              </button>
            </div>
          </div>

          {/* Comparativa de Ritmo Temporal vs Cobros */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-fey-graphite font-medium">
                Ritmo temporal: <span className="text-white font-mono">{daysPassedInWeek}/7 días</span> ({weekTimeProgressPct}%)
              </span>
              <span className="text-fey-mist font-mono">
                Cobrado: {formatPesos(activePlan.actualIncome)} de {formatPesos(activePlan.expectedIncome)} (
                {activePlan.expectedIncome > 0
                  ? Math.round((activePlan.actualIncome / activePlan.expectedIncome) * 100)
                  : 0}
                %)
              </span>
            </div>
            <div className="w-full bg-[#0b0b0b] rounded-full h-2.5 border border-[#242424] overflow-hidden flex">
              <div
                className="bg-fey-signal h-full rounded-full transition-all duration-300"
                style={{
                  width: `${activePlan.expectedIncome > 0 ? Math.min(100, (activePlan.actualIncome / activePlan.expectedIncome) * 100) : 0}%`
                }}
                title="Cobros realizados"
              />
            </div>
          </div>

          {/* 4 Métricas de la Terminal */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-[#0b0b0b] rounded-xl border border-[#242424]">
              <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold">
                Ingreso Proyectado
              </span>
              <span className="text-lg font-mono font-bold text-white block mt-1">
                {formatPesos(activePlan.expectedIncome)}
              </span>
              <span className="text-[10px] text-fey-smoke block mt-0.5">Meta estimada</span>
            </div>

            <div className="p-4 bg-[#0b0b0b] rounded-xl border border-[#242424]">
              <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold">
                Cobrado Real
              </span>
              <span className="text-lg font-mono font-bold text-fey-growth block mt-1">
                {formatPesos(activePlan.actualIncome)}
              </span>
              <span className="text-[10px] text-fey-smoke block mt-0.5">Dinero real ingresado</span>
            </div>

            <div className="p-4 bg-[#0b0b0b] rounded-xl border border-[#242424]">
              <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold">
                Obligaciones Semana
              </span>
              <span className="text-lg font-mono font-bold text-fey-ember block mt-1">
                {formatPesos(analysis.totalObligationsDue)}
              </span>
              <span className="text-[10px] text-fey-smoke block mt-0.5">{obligationsInWeek.length} compromisos</span>
            </div>

            <div className="p-4 bg-[#0b0b0b] rounded-xl border border-[#242424]">
              <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold">
                Brecha de Cobros
              </span>
              <span
                className={`text-lg font-mono font-bold block mt-1 ${
                  analysis.uncoveredObligationsAmount === 0 ? 'text-fey-growth' : 'text-fey-ember'
                }`}
              >
                {analysis.uncoveredObligationsAmount === 0
                  ? '¡Cubierto!'
                  : `-${formatPesos(analysis.uncoveredObligationsAmount)}`}
              </span>
              <span className="text-[10px] text-fey-smoke block mt-0.5">
                {analysis.uncoveredObligationsAmount === 0 ? 'Superávit asegurado' : 'Faltante para compromisos'}
              </span>
            </div>
          </div>

          {/* Alertas Inteligentes del Asistente */}
          {analysis.uncoveredObligationsAmount > 0 ? (
            <div className="p-4 bg-[#211411] border border-[#4a2217] rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-fey-ember shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    Atención de Ritmo: Faltan {formatPesos(analysis.uncoveredObligationsAmount)} para cubrir los vencimientos
                  </h4>
                  <p className="text-xs text-fey-mist">
                    Los ingresos cobrados hasta hoy ({formatPesos(activePlan.actualIncome)}) aún no alcanzan para las obligaciones de esta semana ({formatPesos(analysis.totalObligationsDue)}).
                  </p>
                </div>
              </div>

              {/* Recomendación de gastos postergables */}
              {analysis.postponableExpenses.length > 0 && (
                <div className="pt-2 border-t border-[#3b1c14] space-y-2">
                  <span className="text-[11px] font-bold text-fey-ember uppercase tracking-wider block">
                    Gastos no esenciales que podés postergar para no caer en mora crítica:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.postponableExpenses.map((exp, idx) => (
                      <div key={idx} className="p-2.5 bg-[#140b08] rounded-lg border border-[#3b1c14] text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">{exp.name}</span>
                          <span className="font-mono text-fey-ember">{formatPesos(exp.amount)}</span>
                        </div>
                        <p className="text-[10px] text-fey-graphite mt-1">{exp.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-[#11241a] border border-[#1e482f] rounded-xl flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-5 h-5 text-fey-growth shrink-0" />
              <div>
                <span className="font-bold text-white block">
                  ¡Compromisos de la semana cubiertos al 100%!
                </span>
                <span className="text-fey-mist">
                  Tus ingresos cobrados superan los vencimientos previstos para esta semana. El excedente puede asignarse a tu Fondo de Emergencia o metas de ahorro.
                </span>
              </div>
            </div>
          )}

          {/* Lista de Obligaciones Comprendidas en la Semana */}
          {obligationsInWeek.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#222222]">
              <h4 className="text-xs font-semibold text-fey-graphite uppercase tracking-wider">
                Vencimientos y Gastos Comprendidos en este Ciclo ({obligationsInWeek.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {obligationsInWeek.map((ob) => {
                  const isDebt = 'totalAmount' in ob;
                  const name = ob.name;
                  const amount = isDebt
                    ? ob.minimumPayment && ob.minimumPayment > 0
                      ? ob.minimumPayment
                      : ob.remainingAmount
                    : ob.expectedAmount;

                  return (
                    <div
                      key={ob.id}
                      className="p-3 bg-[#0b0b0b] rounded-xl border border-[#242424] flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-white block truncate max-w-[140px]">{name}</span>
                        <span className="text-[10px] text-fey-smoke block">
                          {isDebt ? `Deuda (${ob.creditor})` : `Gasto Recurrente (${ob.frequency})`}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-fey-ember">{formatPesos(amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Estado vacío: Sin plan semanal activo */
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#1b2535] border border-[#2c3d59] flex items-center justify-center text-fey-signal mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No tenés un plan semanal activo para este ciclo</h3>
          <p className="text-xs text-fey-graphite max-w-md mx-auto">
            Definí cuánto esperás cobrar esta semana ({currentWeekRange.start} al {currentWeekRange.end}) para que el asistente compare tu ritmo de cobro frente a las obligaciones que vencen.
          </p>
          <button
            onClick={async () => {
              await getOrCreateCurrentWeeklyPlan(100000);
            }}
            className="px-5 py-2.5 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button"
          >
            Iniciar Plan para Esta Semana
          </button>
        </div>
      )}

      {/* 2. HISTORIAL DE CICLOS SEMANALES CERRADOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-fey-heading flex items-center gap-2">
            <Archive className="w-4 h-4 text-fey-graphite" />
            Historial de Ciclos Cerrados
          </h3>
          <span className="text-xs font-mono text-fey-graphite">
            {closedPlans.length} semana{closedPlans.length === 1 ? '' : 's'} cerrada{closedPlans.length === 1 ? '' : 's'}
          </span>
        </div>

        {closedPlans.length === 0 ? (
          <div className="p-6 text-center bg-[#141414] border border-[#242424] rounded-2xl text-xs text-fey-graphite">
            Aún no has cerrado semanas anteriores. Al finalizar cada semana, hacé clic en "Cerrar Semana" para consolidar tu balance y comparar lo estimado frente a lo real.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {closedPlans.map((plan) => {
              const variance = plan.actualIncome - plan.expectedIncome;
              return (
                <div
                  key={plan.id}
                  className="bg-[#141414] border border-[#242424] rounded-2xl p-4.5 shadow-fey-card space-y-3 fey-halo-hover"
                >
                  <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                    <span className="text-xs font-mono text-fey-mist font-semibold">
                      {plan.weekStartDate} — {plan.weekEndDate}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#191919] border border-[#2c2c2c] text-fey-graphite">
                      Cerrada
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-[#0b0b0b] rounded-lg border border-[#222222]">
                      <span className="text-[10px] text-fey-graphite block">Estimado</span>
                      <span className="font-mono font-bold text-white block mt-0.5">
                        {formatPesos(plan.expectedIncome)}
                      </span>
                    </div>

                    <div className="p-2 bg-[#0b0b0b] rounded-lg border border-[#222222]">
                      <span className="text-[10px] text-fey-graphite block">Cobrado Real</span>
                      <span className="font-mono font-bold text-fey-growth block mt-0.5">
                        {formatPesos(plan.actualIncome)}
                      </span>
                    </div>

                    <div className="p-2 bg-[#0b0b0b] rounded-lg border border-[#222222]">
                      <span className="text-[10px] text-fey-graphite block">Desvío</span>
                      <span
                        className={`font-mono font-bold block mt-0.5 ${
                          variance >= 0 ? 'text-fey-growth' : 'text-fey-ember'
                        }`}
                      >
                        {variance >= 0 ? '+' : ''}{formatPesos(variance)}
                      </span>
                    </div>
                  </div>

                  {plan.notes && (
                    <p className="text-[11px] text-fey-smoke italic bg-[#0b0b0b] p-2.5 rounded-lg border border-[#222222]">
                      "{plan.notes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CIERRE DE SEMANA */}
      {isClosingModalOpen && activePlan && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#141414] border border-[#282828] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-fey-modal relative my-auto max-h-[92dvh] flex flex-col text-white animate-in fade-in duration-200">
            <div className="flex-shrink-0 mb-3">
              <span className="text-[10px] font-bold text-fey-graphite uppercase tracking-wider block">
                Consolidación de Ciclo
              </span>
              <h3 className="text-lg font-bold text-white tracking-fey-heading">
                Cerrar Semana ({activePlan.weekStartDate} a {activePlan.weekEndDate})
              </h3>
              <p className="text-xs text-fey-graphite mt-0.5">
                Al cerrar la semana se congelará el balance de ingresos cobrados frente a obligaciones para tu historial.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="p-3 bg-[#0b0b0b] rounded-xl border border-[#242424] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-fey-graphite">Ingresos Cobrados:</span>
                  <span className="font-mono text-fey-growth font-bold">{formatPesos(activePlan.actualIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fey-graphite">Obligaciones de la Semana:</span>
                  <span className="font-mono text-fey-ember font-bold">{formatPesos(activePlan.totalObligations)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#222222]">
                  <span className="text-white font-medium">Balance Neto Semanal:</span>
                  <span className="font-mono text-white font-bold">
                    {formatPesos(activePlan.actualIncome - activePlan.totalObligations)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCloseWeekSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                    Reflexión / Notas de Balance (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="ej. Semana completada con buen ritmo de cobro freelance. El superávit se transfirió a reserva de impuestos."
                    className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs text-white placeholder-fey-graphite focus:outline-none focus:border-fey-signal transition resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222222]">
                  <button
                    type="button"
                    onClick={() => setIsClosingModalOpen(false)}
                    disabled={isClosingSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-fey-graphite hover:text-white rounded-full transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isClosingSubmitting}
                    className="px-5 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
                  >
                    {isClosingSubmitting ? 'Cerrando...' : 'Confirmar Cierre de Semana'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      <WeeklyPlanModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPlanToEdit(null);
        }}
        planToEdit={planToEdit}
      />
    </div>
  );
};
