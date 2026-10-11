import React from 'react';
import { Calendar, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import type { Debt, RecurringObligation, VirtualReserve } from '../../types';
import { formatPesos } from '../../utils/money';
import { getDaysUntilDue } from '../../core/debts';

interface UpcomingObligationsWidgetProps {
  debts: Debt[];
  recurring: RecurringObligation[];
  reserves: VirtualReserve[];
}

export const UpcomingObligationsWidget: React.FC<UpcomingObligationsWidgetProps> = ({
  debts,
  recurring,
  reserves
}) => {
  const today = new Date().toISOString().split('T')[0];

  // Consolidar deudas activas
  const activeDebts = debts
    .filter((d) => !d.isDeleted && d.status !== 'paid' && d.remainingAmount > 0)
    .map((d) => {
      const days = getDaysUntilDue(d.dueDate, today);
      const isReserved = reserves.some((r) => r.targetId === d.id && r.status === 'active');
      return {
        id: d.id,
        name: d.name,
        type: 'debt' as const,
        amount: d.remainingAmount,
        dueDate: d.dueDate,
        days,
        isReserved,
        severity: d.consequenceType
      };
    });

  // Consolidar gastos recurrentes del mes
  const activeRecurring = recurring
    .filter((r) => !r.isDeleted && r.isActive)
    .map((r) => {
      // Calcular fecha estimada del día de vencimiento de este mes
      const [year, month] = today.split('-').map(Number);
      const dueDay = Math.min(r.dueDay, 28); // seguro para meses
      const dueDateStr = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
      const days = getDaysUntilDue(dueDateStr, today);
      const isReserved = reserves.some((res) => res.targetId === r.id && res.status === 'active');

      return {
        id: r.id,
        name: r.name,
        type: 'recurring' as const,
        amount: r.expectedAmount,
        dueDate: dueDateStr,
        days,
        isReserved,
        severity: r.priority === 1 ? 'critical_cut' : 'mild'
      };
    });

  const allItems = [...activeDebts, ...activeRecurring].sort((a, b) => a.days - b.days);

  const getDueBadge = (days: number) => {
    if (days < 0) {
      return (
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
          Vencida hace {Math.abs(days)}d
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
          Vence Hoy
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Vence en {days}d
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
        En {days} días
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Próximos Vencimientos
          </h3>
          <p className="text-xs text-slate-400">
            Obligaciones ordenadas por inminencia temporal
          </p>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          {allItems.length} pendiente(s)
        </span>
      </div>

      {allItems.length === 0 ? (
        <div className="p-6 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-xs text-slate-300 font-medium">No tenés vencimientos pendientes cargados.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Podés agregar deudas o gastos fijos en los siguientes módulos.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 max-h-[280px] overflow-y-auto pr-1">
          {allItems.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{item.name}</span>
                  {getDueBadge(item.days)}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{item.type === 'debt' ? 'Deuda' : 'Gasto Fijo'}</span>
                  <span>•</span>
                  {item.isReserved ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Fondos Reservados
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Sin Financiar
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-mono font-bold text-white block">
                  {formatPesos(item.amount)}
                </span>
                <span className="text-[10px] text-slate-500">{item.dueDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
