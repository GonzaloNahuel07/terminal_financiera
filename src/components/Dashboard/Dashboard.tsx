import React from 'react';
import { Coins, PlusCircle, ArrowUpRight } from 'lucide-react';
import type {
  Account,
  Transaction,
  Debt,
  RecurringObligation,
  SavingsGoal,
  VirtualReserve,
  AmountPesos
} from '../../types';
import { AssistantRecommendations } from './AssistantRecommendations';
import { UpcomingObligationsWidget } from './UpcomingObligationsWidget';
import { IncomeVsExpectedWidget } from './IncomeVsExpectedWidget';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  recurring: RecurringObligation[];
  savingsGoals: SavingsGoal[];
  reserves: VirtualReserve[];
  totalRealBalance: AmountPesos;
  freeBalance: AmountPesos;
  onOpenDailyIncomeModal: () => void;
  onOpenTransactionModal: () => void;
  onNavigateToTab: (tab: 'accounts' | 'transactions') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  accounts,
  transactions,
  debts,
  recurring,
  savingsGoals,
  reserves,
  totalRealBalance,
  freeBalance,
  onOpenDailyIncomeModal,
  onOpenTransactionModal,
  onNavigateToTab
}) => {
  return (
    <div className="space-y-6">
      {/* Botón de Acción Principal Destacado: Cobro Diario Variable */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
            <Coins className="w-3.5 h-3.5" />
            Flujo Diario Ágil
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ¿Tuviste cobros de dinero hoy?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
            Registrá ingresos variables al instante. El asistente analizará tus deudas y te sugerirá qué reservar antes de gastar.
          </p>
        </div>

        <button
          onClick={onOpenDailyIncomeModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-sm transition shadow-xl shadow-slate-950/30 active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
          Registrar Cobro de Hoy
        </button>
      </div>

      {/* Accesos Rápidos del Dashboard */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => onNavigateToTab('accounts')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition"
        >
          Administrar {accounts.length} Cuentas
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
        </button>
        <button
          onClick={onOpenTransactionModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition"
        >
          Registrar Gasto o Transferencia
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
        </button>
        <button
          onClick={() => onNavigateToTab('transactions')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition"
        >
          Ver Historial de Movimientos
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Widget Principal: Recomendaciones del Asistente */}
      <AssistantRecommendations
        freeBalance={freeBalance}
        totalRealBalance={totalRealBalance}
        debts={debts}
        recurring={recurring}
        savingsGoals={savingsGoals}
        onOpenIncomeModal={onOpenDailyIncomeModal}
      />

      {/* Grid de 2 Columnas: Vencimientos Próximos & Comparativa de Ingresos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingObligationsWidget
          debts={debts}
          recurring={recurring}
          reserves={reserves}
        />

        <IncomeVsExpectedWidget
          transactions={transactions}
        />
      </div>
    </div>
  );
};
