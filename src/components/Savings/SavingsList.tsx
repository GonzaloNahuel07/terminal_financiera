import React, { useState } from 'react';
import {
  ShieldCheck,
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Calendar
} from 'lucide-react';
import type { SavingsGoal, AmountPesos, RecurringObligation } from '../../types';
import { formatPesos } from '../../utils/money';
import {
  contributeToSavingsGoal,
  withdrawFromSavingsGoal,
  deleteSavingsGoal,
  initializeEmergencyFundIfNeeded
} from '../../services/savingsService';
import { SavingsModal } from './SavingsModal';

interface SavingsListProps {
  savingsGoals: SavingsGoal[];
  freeBalance: AmountPesos;
  recurring: RecurringObligation[];
}

export const SavingsList: React.FC<SavingsListProps> = ({
  savingsGoals,
  freeBalance,
  recurring
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);

  // Quick Action Modal (Aporte o Retiro)
  const [actionType, setActionType] = useState<'contribute' | 'withdraw' | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [actionAmount, setActionAmount] = useState<number>(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const activeGoals = savingsGoals.filter((g) => !g.isDeleted);
  const emergencyFund = activeGoals.find((g) => g.isEmergencyFund);
  const otherGoals = activeGoals.filter((g) => !g.isEmergencyFund);

  // Calcular gasto mensual recurrente total para estimar cobertura de emergencia
  const monthlyRecurringExpense = recurring
    .filter((r) => !r.isDeleted && r.isActive)
    .reduce((acc, r) => {
      if (r.frequency === 'weekly') return acc + r.expectedAmount * 4;
      if (r.frequency === 'biweekly') return acc + r.expectedAmount * 2;
      return acc + r.expectedAmount;
    }, 0);

  const emergencyMonthsCovered =
    emergencyFund && monthlyRecurringExpense > 0
      ? (emergencyFund.currentAmount / monthlyRecurringExpense).toFixed(1)
      : '0.0';

  const totalSavedAllGoals = activeGoals.reduce((acc, g) => acc + g.currentAmount, 0);

  const handleOpenAction = (goal: SavingsGoal, type: 'contribute' | 'withdraw') => {
    setSelectedGoal(goal);
    setActionType(type);
    setActionAmount(0);
    setActionError(null);
  };

  const handleCloseAction = () => {
    setSelectedGoal(null);
    setActionType(null);
    setActionAmount(0);
    setActionError(null);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !actionType) return;

    if (actionAmount <= 0) {
      setActionError('El importe debe ser mayor a 0 pesos.');
      return;
    }

    try {
      setIsSubmittingAction(true);
      setActionError(null);

      if (actionType === 'contribute') {
        if (actionAmount > freeBalance) {
          setActionError(`No disponés de suficiente saldo libre ($${freeBalance.toLocaleString('es-AR')}).`);
          return;
        }
        await contributeToSavingsGoal({
          goalId: selectedGoal.id,
          amount: Math.round(actionAmount)
        });
      } else {
        if (actionAmount > selectedGoal.currentAmount) {
          setActionError(`No podés retirar más de lo acumulado ($${selectedGoal.currentAmount.toLocaleString('es-AR')}).`);
          return;
        }
        await withdrawFromSavingsGoal({
          goalId: selectedGoal.id,
          amount: Math.round(actionAmount)
        });
      }

      handleCloseAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al procesar la operación.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDelete = async (goal: SavingsGoal) => {
    if (goal.isEmergencyFund) {
      if (!confirm('¿Seguro que deseás dar de baja el Fondo de Emergencia?')) return;
    } else {
      if (!confirm(`¿Seguro que deseás eliminar la meta "${goal.name}"?`)) return;
    }
    await deleteSavingsGoal(goal.id);
  };

  return (
    <div className="space-y-6">
      {/* Header de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-fey-growth text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            Construcción de Riqueza & Seguridad
          </div>
          <h2 className="text-2xl font-bold tracking-fey-display text-white">
            Ahorro y Fondo de Emergencia.
          </h2>
          <p className="text-xs text-fey-graphite">
            Total protegido y reservado:{' '}
            <span className="font-mono text-fey-growth font-bold">
              {formatPesos(totalSavedAllGoals)}
            </span>{' '}
            • Saldo Libre para aportar:{' '}
            <span className="font-mono text-white font-bold">
              {formatPesos(freeBalance)}
            </span>
          </p>
        </div>

        <button
          onClick={() => {
            setGoalToEdit(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Meta de Ahorro
        </button>
      </div>

      {/* 1. HERO CARD: FONDO DE EMERGENCIA */}
      {emergencyFund ? (
        <div className="bg-[#141414] border border-[#26382e] rounded-2xl p-6 shadow-fey-card relative overflow-hidden fey-halo-hover">
          <div className="absolute top-0 right-0 w-64 h-64 bg-fey-growth/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#1b2a22] border border-[#2b4c38] text-fey-growth">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white tracking-fey-heading">
                      {emergencyFund.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1b2a22] border border-[#2b4c38] text-fey-growth">
                      Prioridad #1 Absoluta
                    </span>
                  </div>
                  <p className="text-xs text-fey-graphite mt-0.5">
                    Colchón financiero virtualmente apartado para imprevistos médicos, mecánicos o laborales
                  </p>
                </div>
              </div>

              {/* Barra de progreso del Fondo */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-fey-graphite font-medium">
                    Acumulado: <span className="font-mono text-white font-bold">{formatPesos(emergencyFund.currentAmount)}</span>
                  </span>
                  <span className="text-fey-mist font-mono">
                    Meta: {formatPesos(emergencyFund.targetAmount)} ({Math.min(100, Math.round((emergencyFund.currentAmount / emergencyFund.targetAmount) * 100))}%)
                  </span>
                </div>
                <div className="w-full bg-[#0b0b0b] rounded-full h-3 border border-[#282828] overflow-hidden">
                  <div
                    className="bg-fey-growth h-full rounded-full transition-all duration-500 shadow-fey-growth-glow"
                    style={{
                      width: `${Math.min(100, Math.round((emergencyFund.currentAmount / emergencyFund.targetAmount) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Indicador de Meses de Cobertura */}
              <div className="flex items-center gap-3 text-xs pt-1">
                <div className="px-3 py-1.5 rounded-xl bg-[#0b0b0b] border border-[#242424] text-fey-mist">
                  Cobertura calculada:{' '}
                  <span className="font-mono font-bold text-fey-growth">
                    {emergencyMonthsCovered} meses
                  </span>{' '}
                  de gastos fijos ({formatPesos(monthlyRecurringExpense)}/mes)
                </div>
              </div>
            </div>

            {/* Acciones del Fondo de Emergencia */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
              <button
                onClick={() => handleOpenAction(emergencyFund, 'contribute')}
                disabled={freeBalance <= 0}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button disabled:opacity-40"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                Aportar al Fondo
              </button>

              <button
                onClick={() => handleOpenAction(emergencyFund, 'withdraw')}
                disabled={emergencyFund.currentAmount <= 0}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#191919] hover:bg-[#222222] text-fey-mist hover:text-white font-semibold text-xs rounded-full border border-[#2c2c2c] transition disabled:opacity-40"
              >
                <ArrowDownLeft className="w-4 h-4 text-fey-ember" />
                Retirar Dinero
              </button>

              <button
                onClick={() => {
                  setGoalToEdit(emergencyFund);
                  setIsCreateModalOpen(true);
                }}
                className="text-[11px] text-fey-graphite hover:text-white text-center py-1 transition"
              >
                Ajustar Monto Objetivo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#2b4c38]/40 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#1b2a22] border border-[#2b4c38] flex items-center justify-center text-fey-growth mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">¿No tenés un Fondo de Emergencia creado?</h3>
          <p className="text-xs text-fey-graphite max-w-md mx-auto">
            Tener un colchón equivalente a 1-3 meses de gastos fijos es la regla #1 para no endeudarte ante imprevistos.
          </p>
          <button
            onClick={async () => {
              await initializeEmergencyFundIfNeeded(150000);
            }}
            className="px-5 py-2.5 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button"
          >
            Inicializar Fondo de Emergencia ($150.000)
          </button>
        </div>
      )}

      {/* 2. METAS DE AHORRO ADICIONALES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-fey-heading flex items-center gap-2">
            <Target className="w-4 h-4 text-fey-signal" />
            Objetivos y Metas de Ahorro
          </h3>
          <span className="text-xs font-mono text-fey-graphite">
            {otherGoals.length} meta{otherGoals.length === 1 ? '' : 's'}
          </span>
        </div>

        {otherGoals.length === 0 ? (
          <div className="p-8 text-center bg-[#141414] border border-[#242424] rounded-2xl space-y-2">
            <p className="text-xs text-fey-graphite">
              No tenés metas de ahorro adicionales configuradas aún.
            </p>
            <p className="text-[11px] text-fey-smoke">
              Creá metas como "Vacaciones", "Comprar herramientas", "Reparación auto" para apartar dinero con propósito.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherGoals.map((goal) => {
              const progressPct = Math.min(
                100,
                Math.round((goal.currentAmount / goal.targetAmount) * 100)
              );
              const isCompleted = goal.status === 'completed' || goal.currentAmount >= goal.targetAmount;

              return (
                <div
                  key={goal.id}
                  className="bg-[#141414] border border-[#242424] rounded-2xl p-5 shadow-fey-card space-y-4 fey-halo-hover flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base tracking-tight">
                            {goal.name}
                          </h4>
                          {isCompleted ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1b2a22] border border-[#2b4c38] text-fey-growth">
                              <CheckCircle2 className="w-3 h-3" /> ¡Cumplida!
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#191919] border border-[#2b2b2b] text-fey-graphite">
                              Prioridad {goal.priority}
                            </span>
                          )}
                        </div>

                        {goal.targetDate && (
                          <div className="flex items-center gap-1.5 text-[11px] text-fey-graphite mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Objetivo: {goal.targetDate}
                          </div>
                        )}
                      </div>

                      {/* Botones de edición / eliminación */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setGoalToEdit(goal);
                            setIsCreateModalOpen(true);
                          }}
                          className="p-1.5 text-fey-graphite hover:text-white rounded-lg hover:bg-[#222222] transition"
                          title="Editar Meta"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(goal)}
                          className="p-1.5 text-fey-graphite hover:text-red-400 rounded-lg hover:bg-[#222222] transition"
                          title="Eliminar Meta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-white font-bold">
                          {formatPesos(goal.currentAmount)}
                        </span>
                        <span className="font-mono text-fey-graphite">
                          Meta: {formatPesos(goal.targetAmount)} ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#0b0b0b] rounded-full h-2 border border-[#242424] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-fey-growth shadow-fey-growth-glow' : 'bg-fey-signal'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones de aporte y retiro */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#222222]">
                    <button
                      onClick={() => handleOpenAction(goal, 'contribute')}
                      disabled={freeBalance <= 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold bg-[#1a1a1a] hover:bg-[#242424] text-white border border-[#2a2a2a] transition disabled:opacity-40"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-fey-growth" />
                      Aportar
                    </button>
                    <button
                      onClick={() => handleOpenAction(goal, 'withdraw')}
                      disabled={goal.currentAmount <= 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold bg-[#1a1a1a] hover:bg-[#242424] text-fey-graphite hover:text-white border border-[#2a2a2a] transition disabled:opacity-40"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 text-fey-ember" />
                      Retirar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE APORTE / RETIRO RÁPIDO */}
      {actionType && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#282828] w-full max-w-sm rounded-2xl p-6 shadow-fey-modal space-y-4 animate-in fade-in duration-200">
            <div>
              <span className="text-[10px] font-bold text-fey-graphite uppercase tracking-wider block">
                {actionType === 'contribute' ? 'Aporte a Meta' : 'Retiro de Meta'}
              </span>
              <h3 className="text-lg font-bold text-white tracking-fey-heading">
                {selectedGoal.name}
              </h3>
              <p className="text-xs text-fey-graphite mt-0.5">
                {actionType === 'contribute'
                  ? `Saldo libre disponible: ${formatPesos(freeBalance)}`
                  : `Acumulado en la meta: ${formatPesos(selectedGoal.currentAmount)}`}
              </p>
            </div>

            {actionError && (
              <div className="p-2.5 bg-[#241414] border border-[#441a1a] rounded-xl text-xs text-red-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1.5">
                  Importe en Pesos (ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-fey-graphite font-mono">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    autoFocus
                    value={actionAmount || ''}
                    onChange={(e) => setActionAmount(Math.round(Number(e.target.value)))}
                    placeholder="0"
                    className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-fey-graphite focus:outline-none focus:border-fey-growth transition"
                  />
                </div>
              </div>

              {/* Botón rápido del monto sugerido */}
              {actionType === 'contribute' && freeBalance > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActionAmount(Math.min(freeBalance, selectedGoal.targetAmount - selectedGoal.currentAmount))}
                    className="px-2.5 py-1 text-[11px] bg-[#1a1a1a] hover:bg-[#242424] text-fey-mist rounded-lg transition"
                  >
                    Restante para meta
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionAmount(freeBalance)}
                    className="px-2.5 py-1 text-[11px] bg-[#1a1a1a] hover:bg-[#242424] text-fey-mist rounded-lg transition"
                  >
                    Todo el libre ({formatPesos(freeBalance)})
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={handleCloseAction}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 text-xs font-semibold text-fey-graphite hover:text-white rounded-full transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button disabled:opacity-50"
                >
                  {isSubmittingAction
                    ? 'Procesando...'
                    : actionType === 'contribute'
                    ? 'Confirmar Aporte'
                    : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      <SavingsModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setGoalToEdit(null);
        }}
        goalToEdit={goalToEdit}
      />
    </div>
  );
};
