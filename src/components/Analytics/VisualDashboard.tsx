import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  CreditCard,
  Wallet,
  ShieldCheck,
  Target
} from 'lucide-react';
import type { Transaction, Account, Debt, SavingsGoal, VirtualReserve } from '../../types';
import { formatPesos } from '../../utils/money';

interface VisualDashboardProps {
  transactions: Transaction[];
  accounts: Account[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  reserves: VirtualReserve[];
}

export const VisualDashboard: React.FC<VisualDashboardProps> = ({
  transactions,
  accounts,
  debts,
  savingsGoals,
  reserves
}) => {
  const [period, setPeriod] = useState<'current_month' | 'last_30_days' | 'all'>('current_month');

  // Filtrado de transacciones según período
  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const filteredTransactions = transactions.filter((tx) => {
    if (tx.isDeleted) return false;
    if (period === 'current_month') return tx.date.startsWith(currentMonthStr);
    if (period === 'last_30_days') return tx.date >= thirtyDaysAgo;
    return true;
  });

  // 1. Totales de ingresos y gastos del período
  const totalIncome = filteredTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalExpense = filteredTransactions
    .filter((tx) => tx.type === 'expense' || tx.type === 'debt_payment')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const netSavings = totalIncome - totalExpense;

  // 2. Desglose de Gastos por Categoría
  const categoryMap = new Map<string, number>();
  for (const tx of filteredTransactions) {
    if (tx.type === 'expense' || tx.type === 'debt_payment') {
      const cat = tx.category || 'Otros';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + tx.amount);
    }
  }

  const sortedCategories = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // 3. Distribución por tipo de cuenta
  const cashTotal = accounts
    .filter((a) => !a.isDeleted && a.type === 'cash')
    .reduce((acc, a) => acc + a.currentBalance, 0);

  const bankTotal = accounts
    .filter((a) => !a.isDeleted && a.type === 'bank')
    .reduce((acc, a) => acc + a.currentBalance, 0);

  const walletTotal = accounts
    .filter((a) => !a.isDeleted && a.type === 'wallet')
    .reduce((acc, a) => acc + a.currentBalance, 0);

  const totalLiquidity = cashTotal + bankTotal + walletTotal;

  // 4. Estado de Amortización de Deudas
  const totalDebtOriginal = debts.filter((d) => !d.isDeleted).reduce((acc, d) => acc + d.totalAmount, 0);
  const totalDebtRemaining = debts.filter((d) => !d.isDeleted).reduce((acc, d) => acc + d.remainingAmount, 0);
  const totalDebtPaid = Math.max(0, totalDebtOriginal - totalDebtRemaining);
  const debtAmortizationPct = totalDebtOriginal > 0 ? Math.round((totalDebtPaid / totalDebtOriginal) * 100) : 0;

  // 5. Agrupación por días (para gráfico de barras SVG de ingresos vs gastos)
  const dailyMap = new Map<string, { income: number; expense: number }>();
  for (const tx of filteredTransactions) {
    const day = tx.date;
    const existing = dailyMap.get(day) ?? { income: 0, expense: 0 };
    if (tx.type === 'income') existing.income += tx.amount;
    if (tx.type === 'expense' || tx.type === 'debt_payment') existing.expense += tx.amount;
    dailyMap.set(day, existing);
  }

  const dailyEntries = Array.from(dailyMap.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-14); // Últimos 14 días con movimientos

  const maxDailyValue = Math.max(
    1,
    ...dailyEntries.map(([, data]) => Math.max(data.income, data.expense))
  );

  return (
    <div className="space-y-6">
      {/* Encabezado de la Sección de Dashboards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-fey-signal text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            Analítica Financiera
          </div>
          <h2 className="text-2xl font-bold tracking-fey-display text-white">
            Dashboards Visuales.
          </h2>
          <p className="text-xs text-fey-graphite">
            Métricas de flujo de caja, concentración de gastos y amortización
          </p>
        </div>

        {/* Selector de Período (Pastillas Fey) */}
        <div className="flex items-center gap-1.5 p-1 bg-[#141414] border border-[#242424] rounded-full self-start sm:self-auto">
          <button
            onClick={() => setPeriod('current_month')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              period === 'current_month'
                ? 'bg-white text-black font-bold shadow-fey-button'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            Mes Actual
          </button>
          <button
            onClick={() => setPeriod('last_30_days')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              period === 'last_30_days'
                ? 'bg-white text-black font-bold shadow-fey-button'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            30 Días
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              period === 'all'
                ? 'bg-white text-black font-bold shadow-fey-button'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Tarjetas Resumen de Rendimiento del Período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-4.5 shadow-fey-card fey-halo-hover">
          <span className="text-[11px] font-semibold text-fey-graphite uppercase tracking-wider block">
            Ingresos Cobrados
          </span>
          <span className="text-2xl font-mono font-bold text-fey-growth block mt-1">
            +{formatPesos(totalIncome)}
          </span>
          <span className="text-[10px] text-fey-smoke block mt-0.5">Total entrante del período</span>
        </div>

        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-4.5 shadow-fey-card fey-halo-hover">
          <span className="text-[11px] font-semibold text-fey-graphite uppercase tracking-wider block">
            Gastos y Pagos
          </span>
          <span className="text-2xl font-mono font-bold text-fey-ember block mt-1">
            -{formatPesos(totalExpense)}
          </span>
          <span className="text-[10px] text-fey-smoke block mt-0.5">Egresos y cuotas abonadas</span>
        </div>

        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-4.5 shadow-fey-card fey-halo-hover">
          <span className="text-[11px] font-semibold text-fey-graphite uppercase tracking-wider block">
            Flujo Neto (Superávit)
          </span>
          <span
            className={`text-2xl font-mono font-bold block mt-1 ${
              netSavings >= 0 ? 'text-white' : 'text-red-400'
            }`}
          >
            {netSavings >= 0 ? '+' : ''}{formatPesos(netSavings)}
          </span>
          <span className="text-[10px] text-fey-smoke block mt-0.5">Capacidad neta acumulada</span>
        </div>
      </div>

      {/* Gráfico 1: Evolución Diaria de Cobros vs Gastos (SVG Puro) */}
      <div className="bg-[#141414] border border-[#242424] rounded-2xl p-5 shadow-fey-card space-y-4 fey-halo-hover">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-base tracking-fey-heading text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-fey-growth" />
              Evolución Diaria: Ingresos vs. Gastos
            </h3>
            <p className="text-xs text-fey-graphite">Comparativa visual de flujo diario</p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-fey-growth font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-fey-growth" /> Ingreso
            </span>
            <span className="flex items-center gap-1.5 text-fey-ember font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-fey-ember" /> Gasto / Cuota
            </span>
          </div>
        </div>

        {dailyEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-fey-graphite bg-[#0b0b0b] rounded-xl border border-[#242424]">
            No hay movimientos registrados en el período seleccionado para graficar.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 bg-[#0b0b0b] rounded-xl border border-[#242424] overflow-x-auto">
              {dailyEntries.map(([date, data]) => {
                const incomeH = Math.round((data.income / maxDailyValue) * 100);
                const expenseH = Math.round((data.expense / maxDailyValue) * 100);
                const dayLabel = date.slice(8); // DD

                return (
                  <div key={date} className="flex-1 min-w-[28px] h-full flex flex-col justify-end items-center group relative">
                    {/* Tooltip Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#191919] border border-[#333333] text-[10px] text-white p-2 rounded-lg shadow-fey-card pointer-events-none whitespace-nowrap z-30">
                      <span className="font-bold block text-fey-mist">{date}</span>
                      <span className="text-fey-growth block">Ingreso: {formatPesos(data.income)}</span>
                      <span className="text-fey-ember block">Gasto: {formatPesos(data.expense)}</span>
                    </div>

                    {/* Barras gemelas */}
                    <div className="w-full flex items-end justify-center gap-1 h-32">
                      <div
                        className="w-2.5 bg-fey-growth rounded-t-sm transition-all duration-300"
                        style={{ height: `${Math.max(4, incomeH)}%` }}
                      />
                      <div
                        className="w-2.5 bg-fey-ember rounded-t-sm transition-all duration-300"
                        style={{ height: `${Math.max(4, expenseH)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-fey-graphite mt-1.5">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-fey-graphite text-right">Valores normalizados en escala diaria • Pase el mouse o toque para detalle</p>
          </div>
        )}
      </div>

      {/* Grid de 2 Columnas: Desglose por Categorías & Amortización de Deudas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 2: Desglose de Gastos por Categoría */}
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-5 shadow-fey-card space-y-4 fey-halo-hover">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-fey-ember" />
              Concentración de Gastos
            </h3>
            <span className="text-xs font-mono text-fey-graphite">{sortedCategories.length} categorías</span>
          </div>

          {sortedCategories.length === 0 ? (
            <p className="text-xs text-fey-graphite py-6 text-center">Sin gastos registrados en el período.</p>
          ) : (
            <div className="space-y-3">
              {sortedCategories.slice(0, 5).map((cat) => {
                const pct = totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0;
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-medium">{cat.name}</span>
                      <span className="font-mono text-fey-mist">
                        {formatPesos(cat.amount)} <span className="text-fey-graphite">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#0b0b0b] rounded-full h-1.5 border border-[#222222] overflow-hidden">
                      <div
                        className="bg-fey-ember h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfico 3: Trayectoria de Deudas vs Pagos */}
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-5 shadow-fey-card space-y-4 fey-halo-hover">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-fey-growth" />
              Amortización Global de Deudas
            </h3>
            <span className="text-xs font-mono text-fey-growth font-bold">{debtAmortizationPct}% saldado</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-fey-graphite">
                <span>Progreso total de desendeudamiento</span>
                <span className="text-white font-mono">{formatPesos(totalDebtPaid)} de {formatPesos(totalDebtOriginal)}</span>
              </div>
              <div className="w-full bg-[#0b0b0b] rounded-full h-2.5 border border-[#222222] overflow-hidden">
                <div
                  className="bg-fey-growth h-full rounded-full transition-all duration-500 shadow-fey-growth-glow"
                  style={{ width: `${debtAmortizationPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-3 bg-[#0b0b0b] rounded-xl border border-[#242424]">
                <span className="text-[10px] text-fey-graphite block">Monto Pagado</span>
                <span className="font-mono font-bold text-fey-growth text-sm mt-0.5 block">
                  {formatPesos(totalDebtPaid)}
                </span>
              </div>
              <div className="p-3 bg-[#0b0b0b] rounded-xl border border-[#242424]">
                <span className="text-[10px] text-fey-graphite block">Saldo Pendiente</span>
                <span className="font-mono font-bold text-fey-ember text-sm mt-0.5 block">
                  {formatPesos(totalDebtRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico 4: Composición Patrimonial por Tipo de Cuenta */}
      <div className="bg-[#141414] border border-[#242424] rounded-2xl p-5 shadow-fey-card space-y-3 fey-halo-hover">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-fey-signal" />
            Distribución del Patrimonio Líquido ({formatPesos(totalLiquidity)})
          </h3>
          <span className="text-xs font-mono text-fey-graphite">{accounts.length} cuentas</span>
        </div>

        <div className="w-full h-3 bg-[#0b0b0b] rounded-full overflow-hidden flex border border-[#222222]">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${totalLiquidity > 0 ? (bankTotal / totalLiquidity) * 100 : 0}%` }}
            title={`Bancos: ${formatPesos(bankTotal)}`}
          />
          <div
            className="bg-fey-signal h-full transition-all duration-300"
            style={{ width: `${totalLiquidity > 0 ? (walletTotal / totalLiquidity) * 100 : 0}%` }}
            title={`Billeteras: ${formatPesos(walletTotal)}`}
          />
          <div
            className="bg-fey-growth h-full transition-all duration-300"
            style={{ width: `${totalLiquidity > 0 ? (cashTotal / totalLiquidity) * 100 : 0}%` }}
            title={`Efectivo: ${formatPesos(cashTotal)}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-[#0b0b0b] rounded-xl border border-[#242424] flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-fey-graphite">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Cuentas Bancarias
            </span>
            <span className="font-mono font-bold text-white">{formatPesos(bankTotal)}</span>
          </div>

          <div className="p-3 bg-[#0b0b0b] rounded-xl border border-[#242424] flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-fey-graphite">
              <span className="w-2.5 h-2.5 rounded-full bg-fey-signal inline-block" /> Billeteras Virtuales
            </span>
            <span className="font-mono font-bold text-white">{formatPesos(walletTotal)}</span>
          </div>

          <div className="p-3 bg-[#0b0b0b] rounded-xl border border-[#242424] flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-fey-graphite">
              <span className="w-2.5 h-2.5 rounded-full bg-fey-growth inline-block" /> Efectivo en Mano
            </span>
            <span className="font-mono font-bold text-white">{formatPesos(cashTotal)}</span>
          </div>
        </div>
      </div>

      {/* Gráfico 5: Cobertura, Fondo de Emergencia y Respaldo Financiero */}
      <div className="bg-[#141414] border border-[#242424] rounded-2xl p-5 shadow-fey-card space-y-4 fey-halo-hover">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-fey-growth" />
            Respaldo Financiero y Cobertura de Contingencias
          </h3>
          <span className="text-xs font-mono text-fey-growth font-bold">
            {reserves.filter((r) => r.status === 'active').length} reservas activas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Fondo de Emergencia */}
          <div className="p-4 bg-[#0b0b0b] rounded-xl border border-[#242424] space-y-2">
            <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-fey-growth" />
              Fondo de Emergencia
            </span>
            {(() => {
              const ef = savingsGoals.find((g) => !g.isDeleted && g.isEmergencyFund);
              if (!ef) {
                return <p className="text-fey-smoke text-xs">No configurado</p>;
              }
              const pct = Math.min(100, Math.round((ef.currentAmount / ef.targetAmount) * 100));
              return (
                <div className="space-y-1">
                  <span className="text-lg font-mono font-bold text-white block">
                    {formatPesos(ef.currentAmount)}
                  </span>
                  <div className="w-full bg-[#191919] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-fey-growth h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-fey-graphite block">
                    {pct}% del objetivo ({formatPesos(ef.targetAmount)})
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Reservas Virtuales Totales */}
          <div className="p-4 bg-[#0b0b0b] rounded-xl border border-[#242424] space-y-2">
            <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-fey-signal" />
              Dinero Blindado en Reservas
            </span>
            {(() => {
              const totalRes = reserves
                .filter((r) => r.status === 'active')
                .reduce((acc, r) => acc + r.amountReserved, 0);
              return (
                <div>
                  <span className="text-lg font-mono font-bold text-fey-signal block">
                    {formatPesos(totalRes)}
                  </span>
                  <p className="text-[10px] text-fey-smoke mt-1">
                    Protegido de gastos impulsivos para obligaciones y metas
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Cobertura Patrimonial de Deudas */}
          <div className="p-4 bg-[#0b0b0b] rounded-xl border border-[#242424] space-y-2">
            <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-fey-ember" />
              Ratio de Solvencia Líquida
            </span>
            <div>
              <span
                className={`text-lg font-mono font-bold block ${
                  totalDebtRemaining === 0 || totalLiquidity >= totalDebtRemaining
                    ? 'text-fey-growth'
                    : 'text-fey-ember'
                }`}
              >
                {totalDebtRemaining === 0
                  ? 'Sin Pasivos (100%)'
                  : `${Math.round((totalLiquidity / totalDebtRemaining) * 100)}% de pasivos`}
              </span>
              <p className="text-[10px] text-fey-smoke mt-1">
                {totalDebtRemaining === 0
                  ? 'Patrimonio libre de cargas crediticias'
                  : `Liquidez total frente a pasivos ($${totalDebtRemaining.toLocaleString('es-AR')})`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
