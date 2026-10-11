import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Unlock,
  Edit2,
  Layers
} from 'lucide-react';
import type {
  VirtualReserve,
  Debt,
  RecurringObligation,
  SavingsGoal,
  AmountPesos
} from '../../types';
import { formatPesos } from '../../utils/money';
import { releaseReserve } from '../../services/reserveService';
import { AllocateReserveModal } from './AllocateReserveModal';

interface ReservesCenterProps {
  reserves: VirtualReserve[];
  debts: Debt[];
  recurring: RecurringObligation[];
  savingsGoals: SavingsGoal[];
  totalRealBalance: AmountPesos;
  freeBalance: AmountPesos;
}

export const ReservesCenter: React.FC<ReservesCenterProps> = ({
  reserves,
  debts,
  recurring,
  savingsGoals,
  totalRealBalance,
  freeBalance
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reserveToEdit, setReserveToEdit] = useState<VirtualReserve | null>(null);

  const activeReserves = reserves.filter((r) => r.status === 'active');
  const totalReserved = activeReserves.reduce((acc, r) => acc + r.amountReserved, 0);

  // Desglose de reservas
  const debtsReserved = activeReserves
    .filter((r) => r.targetType === 'debt')
    .reduce((acc, r) => acc + r.amountReserved, 0);

  const recurringReserved = activeReserves
    .filter((r) => r.targetType === 'recurring_obligation')
    .reduce((acc, r) => acc + r.amountReserved, 0);

  const savingsReserved = activeReserves
    .filter((r) => r.targetType === 'savings_goal')
    .reduce((acc, r) => acc + r.amountReserved, 0);

  // Calcular compromisos aún sin financiar
  let totalPendingCommitments = 0;
  for (const d of debts.filter((d) => !d.isDeleted && d.status !== 'paid')) {
    const matching = activeReserves.find((r) => r.targetId === d.id);
    const res = matching ? matching.amountReserved : 0;
    totalPendingCommitments += Math.max(0, d.remainingAmount - res);
  }
  for (const rec of recurring.filter((r) => !r.isDeleted && r.isActive)) {
    const matching = activeReserves.find((r) => r.targetId === rec.id);
    const res = matching ? matching.amountReserved : 0;
    totalPendingCommitments += Math.max(0, rec.expectedAmount - res);
  }

  // Porcentajes para barra de desglose visual
  const reservedPct = totalRealBalance > 0 ? Math.min(100, Math.round((totalReserved / totalRealBalance) * 100)) : 0;
  const freePct = Math.max(0, 100 - reservedPct);

  const handleRelease = async (id: string, name: string, amount: AmountPesos) => {
    if (confirm(`¿Liberar la reserva de ${formatPesos(amount)} para "${name}"? El dinero volverá de inmediato a tu Saldo Libre para gastar.`)) {
      await releaseReserve(id);
    }
  };

  const getTargetBadge = (type: VirtualReserve['targetType']) => {
    switch (type) {
      case 'debt':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fey-ember/15 text-fey-ember border border-fey-ember/30">
            Deuda
          </span>
        );
      case 'recurring_obligation':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Gasto Fijo
          </span>
        );
      case 'savings_goal':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fey-growth/15 text-fey-growth border border-fey-growth/30">
            Ahorro
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Título y Acción de Creación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-fey-heading text-white">
            Centro de Reservas Virtuales
          </h2>
          <p className="text-xs text-fey-graphite">
            Asignaciones inteligentes para garantizar el cumplimiento de obligaciones sin tocar bancos
          </p>
        </div>

        <button
          onClick={() => {
            setReserveToEdit(null);
            setIsModalOpen(true);
          }}
          disabled={freeBalance <= 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button active:scale-95 disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          Nueva Reserva Virtual
        </button>
      </div>

      {/* Las 5 Métricas Clave de Liquidez (Grid Fey) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Saldo Real */}
        <div className="bg-[#191919] border border-[#262626] rounded-2xl p-4 shadow-fey-card fey-halo-hover">
          <span className="text-[10px] font-semibold uppercase text-fey-graphite block">
            1. Saldo Real Total
          </span>
          <span className="text-lg font-mono font-bold text-white block mt-1">
            {formatPesos(totalRealBalance)}
          </span>
          <span className="text-[10px] text-fey-smoke block mt-0.5">Dinero físico y bancario</span>
        </div>

        {/* 2. Reservas Asignadas */}
        <div className="bg-[#191919] border border-[#262626] rounded-2xl p-4 shadow-fey-card fey-halo-hover">
          <span className="text-[10px] font-semibold uppercase text-fey-ember block">
            2. Reservas Asignadas
          </span>
          <span className="text-lg font-mono font-bold text-fey-ember block mt-1">
            {formatPesos(totalReserved)}
          </span>
          <span className="text-[10px] text-fey-smoke block mt-0.5">{activeReserves.length} asignaciones activas</span>
        </div>

        {/* 3. Saldo Libre */}
        <div className="bg-[#191919] border border-fey-growth/40 rounded-2xl p-4 shadow-fey-card fey-halo-hover">
          <span className="text-[10px] font-semibold uppercase text-fey-growth block">
            3. Saldo Libre
          </span>
          <span className="text-lg font-mono font-bold text-fey-growth block mt-1">
            {formatPesos(freeBalance)}
          </span>
          <span className="text-[10px] text-fey-growth/70 block mt-0.5">Disponible real para gastar</span>
        </div>

        {/* 4. Obligaciones Sin Financiar */}
        <div className="bg-[#191919] border border-[#262626] rounded-2xl p-4 shadow-fey-card fey-halo-hover">
          <span className="text-[10px] font-semibold uppercase text-fey-graphite block">
            4. Sin Financiar
          </span>
          <span className="text-lg font-mono font-bold text-amber-300 block mt-1">
            {formatPesos(totalPendingCommitments)}
          </span>
          <span className="text-[10px] text-fey-smoke block mt-0.5">Compromisos pendientes</span>
        </div>

        {/* 5. Disponible para Ahorro */}
        <div className="bg-[#191919] border border-[#262626] rounded-2xl p-4 shadow-fey-card fey-halo-hover">
          <span className="text-[10px] font-semibold uppercase text-fey-signal block">
            5. Para Ahorro Extra
          </span>
          <span className="text-lg font-mono font-bold text-fey-mist block mt-1">
            {formatPesos(freeBalance)}
          </span>
          <span className="text-[10px] text-fey-smoke block mt-0.5">Excedente no comprometido</span>
        </div>
      </div>

      {/* Medidor Visual de Composición de Liquidez */}
      <div className="bg-[#191919] border border-[#262626] rounded-2xl p-5 shadow-fey-card space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-fey-growth" />
            Composición de tu Dinero: Comprometido ({reservedPct}%) vs. Libre ({freePct}%)
          </span>
          <span className="text-fey-graphite font-mono">
            {formatPesos(totalReserved)} / {formatPesos(totalRealBalance)}
          </span>
        </div>

        {/* Barra Segmentada */}
        <div className="w-full h-3 bg-[#0b0b0b] rounded-full overflow-hidden flex border border-[#222222]">
          <div
            className="bg-fey-ember h-full transition-all duration-300"
            style={{ width: `${totalRealBalance > 0 ? (debtsReserved / totalRealBalance) * 100 : 0}%` }}
            title={`Deudas: ${formatPesos(debtsReserved)}`}
          />
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${totalRealBalance > 0 ? (recurringReserved / totalRealBalance) * 100 : 0}%` }}
            title={`Gastos Fijos: ${formatPesos(recurringReserved)}`}
          />
          <div
            className="bg-fey-mist h-full transition-all duration-300"
            style={{ width: `${totalRealBalance > 0 ? (savingsReserved / totalRealBalance) * 100 : 0}%` }}
            title={`Ahorro: ${formatPesos(savingsReserved)}`}
          />
          <div
            className="bg-fey-growth h-full transition-all duration-300"
            style={{ width: `${totalRealBalance > 0 ? (freeBalance / totalRealBalance) * 100 : 0}%` }}
            title={`Saldo Libre: ${formatPesos(freeBalance)}`}
          />
        </div>

        {/* Leyenda Fey */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-fey-graphite pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fey-ember inline-block" />
            <span>Deudas ({formatPesos(debtsReserved)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Gastos Fijos ({formatPesos(recurringReserved)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fey-mist inline-block" />
            <span>Ahorro ({formatPesos(savingsReserved)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fey-growth inline-block" />
            <span className="text-white font-medium">Saldo Libre ({formatPesos(freeBalance)})</span>
          </div>
        </div>
      </div>

      {/* Listado de Reservas Activas */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white tracking-tight">
          Reservas Virtuales Activas ({activeReserves.length})
        </h3>

        {activeReserves.length === 0 ? (
          <div className="p-8 bg-[#191919] border border-[#262626] rounded-2xl text-center shadow-fey-card">
            <ShieldAlert className="w-8 h-8 text-fey-graphite mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-white">No tenés reservas virtuales activas.</p>
            <p className="text-xs text-fey-graphite mt-1">
              Podés apartar fondos para tus deudas o gastos fijos usando el botón "+ Nueva Reserva Virtual" para proteger tu dinero antes de gastarlo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeReserves.map((reserve) => (
              <div
                key={reserve.id}
                className="bg-[#191919] border border-[#262626] rounded-2xl p-4 shadow-fey-card flex flex-col justify-between space-y-3 fey-halo-hover"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-white tracking-tight truncate">
                      {reserve.targetName}
                    </span>
                    {getTargetBadge(reserve.targetType)}
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-fey-graphite">Apartado Virtual:</span>
                    <span className="text-lg font-mono font-bold text-white">
                      {formatPesos(reserve.amountReserved)}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#262626] flex items-center justify-between">
                  <button
                    onClick={() => {
                      setReserveToEdit(reserve);
                      setIsModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-fey-mist hover:text-white transition"
                  >
                    <Edit2 className="w-3 h-3" />
                    Ajustar
                  </button>

                  <button
                    onClick={() => handleRelease(reserve.id, reserve.targetName, reserve.amountReserved)}
                    className="inline-flex items-center gap-1 text-xs text-fey-graphite hover:text-red-400 transition"
                  >
                    <Unlock className="w-3 h-3" />
                    Liberar a Saldo Libre
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Asignación / Ajuste */}
      <AllocateReserveModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setReserveToEdit(null);
        }}
        debts={debts}
        recurring={recurring}
        savingsGoals={savingsGoals}
        reserves={reserves}
        freeBalance={freeBalance}
        reserveToEdit={reserveToEdit}
      />
    </div>
  );
};
