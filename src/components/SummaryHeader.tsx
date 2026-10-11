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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#141722] hover:bg-spider-cobalt text-white border border-[#262d3a] hover:border-spider-cobalt font-semibold text-xs tracking-wide transition-all shadow-fey-button active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          Registrar Movimiento
        </button>
      </div>

      {/* Tarjetas métricas Gotham Tech & Spider Web (16px radius, tactical surface) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Saldo Real Total - Wayne Tech Titanium & Gold */}
        <div className="bg-[#13161f] border border-[#242b38] rounded-2xl p-4.5 shadow-fey-card relative overflow-hidden fey-halo-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fey-graphite">
              Saldo Real Total
            </span>
            <div className="p-1.5 bg-batman-gold/10 rounded-full text-batman-gold border border-batman-gold/30 shadow-fey-batman-glow">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            {formatPesos(totalRealBalance)}
          </div>
          <p className="text-[11px] text-fey-graphite mt-1">
            Liquidez consolidada en cuentas y efectivo
          </p>
        </div>

        {/* Dinero Comprometido / Reservado - Spider Crimson Alert */}
        <div className="bg-[#13161f] border border-[#242b38] rounded-2xl p-4.5 shadow-fey-card relative overflow-hidden fey-halo-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-spider-crimson">
              Dinero Reservado
            </span>
            <div className="p-1.5 bg-spider-crimson/10 rounded-full text-spider-crimson border border-spider-crimson/30 shadow-fey-spider-glow">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-spider-crimson">
            {formatPesos(totalReserves)}
          </div>
          <p className="text-[11px] text-fey-graphite mt-1">
            Asignaciones virtuales a pasivos y fijos
          </p>
        </div>

        {/* Saldo Libre para Gastar - Bio-Venom & Electric Signal */}
        <div className="bg-[#13161f] border border-[#242b38] rounded-2xl p-4.5 shadow-fey-card relative overflow-hidden fey-halo-hover">
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
            Fondo disponible no comprometido
          </p>
        </div>
      </div>
    </div>
  );
};
