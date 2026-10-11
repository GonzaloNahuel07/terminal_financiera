import React from 'react';
import { Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { AmountPesos, Transaction } from '../../types';
import { formatPesos } from '../../utils/money';

interface IncomeVsExpectedWidgetProps {
  transactions: Transaction[];
  monthlyExpectedIncome?: AmountPesos;
}

export const IncomeVsExpectedWidget: React.FC<IncomeVsExpectedWidgetProps> = ({
  transactions,
  monthlyExpectedIncome = 250000 // Valor base de referencia mensual si no hay plan específico
}) => {
  // Sumar ingresos reales del mes en curso
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const actualMonthlyIncome = transactions
    .filter((tx) => !tx.isDeleted && tx.type === 'income' && tx.date.startsWith(currentMonthPrefix))
    .reduce((acc, tx) => acc + tx.amount, 0);

  const progressPct = Math.min(100, Math.round((actualMonthlyIncome / monthlyExpectedIncome) * 100));
  const diff = actualMonthlyIncome - monthlyExpectedIncome;

  return (
    <div className="bg-[#191919] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-fey-card relative overflow-hidden space-y-4 fey-halo-hover">
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <div>
          <h3 className="text-base font-bold tracking-fey-heading text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-fey-growth" />
            Ingresos: Previstos vs. Reales
          </h3>
          <p className="text-xs text-fey-graphite">
            Comparativa del mes en curso ({currentMonthPrefix})
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-fey-growth bg-fey-growth/10 px-2.5 py-1 rounded-full border border-fey-growth/30 shadow-fey-growth-glow">
          {progressPct}% alcanzado
        </span>
      </div>

      {/* Barra de Progreso Visual */}
      <div className="space-y-1.5">
        <div className="w-full bg-[#0b0b0b] rounded-full h-3 p-0.5 border border-[#222222]">
          <div
            className="bg-fey-growth h-full rounded-full transition-all duration-500 shadow-fey-growth-glow"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-fey-graphite pt-1">
          <div>
            <span className="block text-[10px] text-fey-smoke uppercase font-semibold">Cobrado Real</span>
            <span className="font-mono font-bold text-white text-sm">
              {formatPesos(actualMonthlyIncome)}
            </span>
          </div>

          <div className="text-right">
            <span className="block text-[10px] text-fey-smoke uppercase font-semibold">Meta Prevista</span>
            <span className="font-mono font-semibold text-fey-mist text-sm">
              {formatPesos(monthlyExpectedIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* Indicador de Estado y Explicación */}
      <div className="p-3 bg-[#131313] rounded-xl border border-[#222222] flex items-start gap-2.5 text-xs">
        {diff >= 0 ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-fey-growth flex-shrink-0 mt-0.5" />
            <span className="text-fey-mist">
              ¡Superaste tu meta mensual en <strong className="text-white">{formatPesos(diff)}</strong>! Excelente capacidad de ahorro adicional.
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-fey-ember flex-shrink-0 mt-0.5" />
            <span className="text-fey-mist">
              Faltan <strong className="text-fey-ember">{formatPesos(Math.abs(diff))}</strong> para completar lo previsto. Los cobros esperados <em className="text-fey-graphite not-italic font-medium">no se consideran dinero real</em> hasta ser cobrados.
            </span>
          </>
        )}
      </div>
    </div>
  );
};
