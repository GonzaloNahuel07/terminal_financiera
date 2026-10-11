import React from 'react';
import { DollarSign, ShieldAlert, Sparkles, Plus } from 'lucide-react';
import type { AmountPesos } from '../types';
import { formatPesos } from '../utils/money';

interface SummaryHeaderProps {
  totalRealBalance: AmountPesos;
  totalReserves: AmountPesos;
  freeBalance: AmountPesos;
  onNewTransaction: () => void;
}

export const SummaryHeader: React.FC<SummaryHeaderProps> = ({
  totalRealBalance,
  totalReserves,
  freeBalance,
  onNewTransaction
}) => {
  return (
    <div className="space-y-4">
      {/* Barra de acción rápida superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Resumen de Liquidez
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Control exacto en Pesos Argentinos (ARS) • Cero decimales
          </p>
        </div>

        <button
          onClick={onNewTransaction}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/25 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Registrar Movimiento
        </button>
      </div>

      {/* Tarjetas métricas de dinero real vs comprometido vs libre */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Saldo Real Total */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Saldo Real Total
            </span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-white">
            {formatPesos(totalRealBalance)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dinero existente en todas tus cuentas
          </p>
        </div>

        {/* Dinero Comprometido / Reservado */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Dinero Reservado
            </span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-amber-300">
            {formatPesos(totalReserves)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Asignado virtualmente a obligaciones
          </p>
        </div>

        {/* Saldo Libre para Gastar */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Saldo Libre
            </span>
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-400">
            {formatPesos(freeBalance)}
          </div>
          <p className="text-[11px] text-emerald-500/80 mt-1">
            Dinero disponible real sin comprometer
          </p>
        </div>
      </div>
    </div>
  );
};
