import React from 'react';
import { ShieldAlert, Sparkles, Plus, Wallet } from 'lucide-react';
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
      {/* Barra de acción rápida superior estilo Fey */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-fey-display text-white">
            Resumen de Liquidez.
          </h2>
          <p className="text-xs text-fey-graphite mt-0.5">
            Estado consolidado en Pesos Argentinos (ARS) • Calibre terminal
          </p>
        </div>

        <button
          onClick={onNewTransaction}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#191919] hover:bg-[#222222] text-white border border-[#333333] font-semibold text-xs tracking-wide transition shadow-fey-button active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          Registrar Movimiento
        </button>
      </div>

      {/* Tarjetas métricas Fey (16px radius, #191919 surface, deep black halos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Saldo Real Total */}
        <div className="bg-[#191919] border border-[#262626] rounded-2xl p-4.5 shadow-fey-card relative overflow-hidden fey-halo-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fey-graphite">
              Saldo Real Total
            </span>
            <div className="p-1.5 bg-[#131313] rounded-full text-fey-mist border border-[#2a2a2a]">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            {formatPesos(totalRealBalance)}
          </div>
          <p className="text-[11px] text-fey-graphite mt-1">
            Liquidez existente en todas las cuentas
          </p>
        </div>

        {/* Dinero Comprometido / Reservado */}
        <div className="bg-[#191919] border border-[#262626] rounded-2xl p-4.5 shadow-fey-card relative overflow-hidden fey-halo-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fey-ember">
              Dinero Reservado
            </span>
            <div className="p-1.5 bg-fey-ember/10 rounded-full text-fey-ember border border-fey-ember/30">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-fey-ember">
            {formatPesos(totalReserves)}
          </div>
          <p className="text-[11px] text-fey-graphite mt-1">
            Asignaciones virtuales a obligaciones
          </p>
        </div>

        {/* Saldo Libre para Gastar */}
        <div className="bg-[#191919] border border-[#2a2a2a] rounded-2xl p-4.5 shadow-fey-card relative overflow-hidden fey-halo-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fey-growth">
              Saldo Libre
            </span>
            <div className="p-1.5 bg-fey-growth/10 rounded-full text-fey-growth border border-fey-growth/30 shadow-fey-growth-glow">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-fey-growth">
            {formatPesos(freeBalance)}
          </div>
          <p className="text-[11px] text-fey-graphite mt-1">
            Fondo disponible sin comprometer
          </p>
        </div>
      </div>
    </div>
  );
};
