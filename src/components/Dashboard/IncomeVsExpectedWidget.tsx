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
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Ingresos: Previstos vs. Reales
          </h3>
          <p className="text-xs text-slate-400">
            Comparativa del mes en curso ({currentMonthPrefix})
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          {progressPct}% alcanzado
        </span>
      </div>

      {/* Barra de Progreso Visual */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase">Cobrado Real</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatPesos(actualMonthlyIncome)}
            </span>
          </div>

          <div className="text-right">
            <span className="block text-[10px] text-slate-500 uppercase">Meta Prevista</span>
            <span className="font-mono font-semibold text-slate-300 text-sm">
              {formatPesos(monthlyExpectedIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* Indicador de Estado y Explicación */}
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2.5 text-xs">
        {diff >= 0 ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-300">
              ¡Superaste tu meta mensual en <strong className="text-emerald-400">{formatPesos(diff)}</strong>! Excelente capacidad de ahorro adicional.
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-300">
              Faltan <strong className="text-amber-400">{formatPesos(Math.abs(diff))}</strong> para completar lo previsto. Los cobros esperados <em className="text-slate-400 not-italic font-medium">no se consideran dinero real</em> hasta ser cobrados.
            </span>
          </>
        )}
      </div>
    </div>
  );
};
