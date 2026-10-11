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
  onNavigateToTab: (tab: 'dashboard' | 'reserves' | 'accounts' | 'debts' | 'transactions' | 'analytics' | 'savings') => void;
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
      {/* Banner Principal Estilo Fey con Palabra Acentuada en Ember */}
      <div className="bg-[#191919] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-fey-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 fey-halo-hover">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold text-fey-graphite bg-[#131313] border border-[#2a2a2a]">
            <Coins className="w-3.5 h-3.5 text-fey-ember" />
            Flujo Diario Variable
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-fey-display text-white">
            Administrá tus cobros con precisión <span className="text-fey-ember">financiera</span>.
          </h2>
          <p className="text-xs text-fey-graphite max-w-xl">
            Registrá ingresos variables al instante. El asistente analizará compromisos inminentes y te sugerirá reservas antes de gastar.
          </p>
        </div>

        <button
          onClick={onOpenDailyIncomeModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-black hover:bg-fey-pale font-bold text-xs tracking-wide transition shadow-fey-button active:scale-95"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          Registrar Cobro de Hoy
        </button>
      </div>

      {/* Accesos Rápidos Fey (Pills 99px con hover sutil) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onNavigateToTab('accounts')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#131313] hover:bg-[#1f1f1f] text-xs font-medium text-fey-graphite hover:text-white border border-[#262626] transition"
        >
          {accounts.length} Cuentas Registradas
          <ArrowUpRight className="w-3.5 h-3.5 text-fey-smoke" />
        </button>
        <button
          onClick={() => onNavigateToTab('debts')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#131313] hover:bg-[#1f1f1f] text-xs font-medium text-fey-graphite hover:text-white border border-[#262626] transition"
        >
          {debts.length + recurring.length} Compromisos y Deudas
          <ArrowUpRight className="w-3.5 h-3.5 text-fey-smoke" />
        </button>
        <button
          onClick={() => onNavigateToTab('analytics')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#131313] hover:bg-[#1f1f1f] text-xs font-medium text-fey-signal hover:text-white border border-[#262626] transition"
        >
          Dashboards Visuales
          <ArrowUpRight className="w-3.5 h-3.5 text-fey-signal" />
        </button>
        <button
          onClick={() => onNavigateToTab('savings')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#131313] hover:bg-[#1f1f1f] text-xs font-medium text-fey-growth hover:text-white border border-[#262626] transition"
        >
          {savingsGoals.length} Metas & Fondo Emergencia
          <ArrowUpRight className="w-3.5 h-3.5 text-fey-growth" />
        </button>
        <button
          onClick={onOpenTransactionModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#131313] hover:bg-[#1f1f1f] text-xs font-medium text-fey-graphite hover:text-white border border-[#262626] transition"
        >
          Nuevo Gasto o Transferencia
          <ArrowUpRight className="w-3.5 h-3.5 text-fey-smoke" />
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
