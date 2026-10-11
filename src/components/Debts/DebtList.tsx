import React, { useState } from 'react';
import {
  Plus,
  CreditCard,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';
import type { Debt, Account, VirtualReserve } from '../../types';
import { formatPesos } from '../../utils/money';
import { getDaysUntilDue } from '../../core/debts';
import { deleteDebt } from '../../services/debtService';
import { DebtModal } from './DebtModal';
import { DebtPaymentModal } from './DebtPaymentModal';

interface DebtListProps {
  debts: Debt[];
  accounts: Account[];
  reserves: VirtualReserve[];
}

export const DebtList: React.FC<DebtListProps> = ({ debts, accounts, reserves }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);
  const [debtToPay, setDebtToPay] = useState<Debt | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const totalDebtAmount = debts
    .filter((d) => !d.isDeleted && d.status !== 'paid')
    .reduce((acc, d) => acc + d.remainingAmount, 0);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el registro de la deuda "${name}"?`)) {
      await deleteDebt(id);
    }
  };

  const getStatusBadge = (status: Debt['status'], days: number) => {
    if (status === 'paid') {
      return (
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-fey-growth/15 text-fey-growth border border-fey-growth/30 shadow-fey-growth-glow">
          Pagada
        </span>
      );
    }
    if (status === 'overdue' || days < 0) {
      return (
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
          Vencida hace {Math.abs(days)}d
        </span>
      );
    }
    if (status === 'partial') {
      return (
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Pago Parcial
        </span>
      );
    }
    return (
      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#131313] text-fey-graphite border border-[#2a2a2a]">
        Pendiente
      </span>
    );
  };

  const getConsequencePill = (c: Debt['consequenceType']) => {
    switch (c) {
      case 'critical_cut':
        return (
          <span className="text-[10px] font-semibold text-fey-ember bg-fey-ember/10 border border-fey-ember/30 px-2 py-0.5 rounded-full shadow-fey-ember-glow">
            Corte de Servicio Inminente
          </span>
        );
      case 'punitive_interest':
        return (
          <span className="text-[10px] font-semibold text-fey-ember bg-fey-ember/10 border border-fey-ember/30 px-2 py-0.5 rounded-full">
            Intereses Punitorios
          </span>
        );
      case 'legal':
        return (
          <span className="text-[10px] font-semibold text-fey-mist bg-[#131313] border border-[#333333] px-2 py-0.5 rounded-full">
            Riesgo Reclamo Legal
          </span>
        );
      case 'mild':
        return (
          <span className="text-[10px] font-semibold text-fey-graphite bg-[#131313] border border-[#222222] px-2 py-0.5 rounded-full">
            Consecuencia Leve
          </span>
        );
      case 'none':
        return (
          <span className="text-[10px] font-semibold text-fey-graphite bg-[#131313] border border-[#222222] px-2 py-0.5 rounded-full">
            Sin Recargos
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Título y Total Pasivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-fey-heading text-white">
            Deudas y Vencimientos
          </h2>
          <p className="text-xs text-fey-graphite">
            Compromisos financieros pendientes: <strong className="text-white font-mono">{formatPesos(totalDebtAmount)}</strong>
          </p>
        </div>

        <button
          onClick={() => {
            setDebtToEdit(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          Nueva Deuda
        </button>
      </div>

      {debts.length === 0 ? (
        <div className="bg-[#191919] border border-[#2a2a2a] rounded-2xl p-8 text-center shadow-fey-card">
          <CheckCircle2 className="w-10 h-10 text-fey-growth mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold text-white">¡No tenés deudas registradas!</p>
          <p className="text-xs text-fey-graphite mt-1">Registrá tus compromisos para que el asistente los priorice automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {debts.map((debt) => {
            const days = getDaysUntilDue(debt.dueDate, today);
            const paidPct = Math.round(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100);
            const isReserved = reserves.some((r) => r.targetId === debt.id && r.status === 'active');

            return (
              <div
                key={debt.id}
                className="bg-[#191919] border border-[#262626] rounded-2xl p-4.5 shadow-fey-card flex flex-col justify-between space-y-4 relative overflow-hidden fey-halo-hover"
              >
                {/* Cabecera de la tarjeta */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm tracking-tight text-white">{debt.name}</h3>
                        {getStatusBadge(debt.status, days)}
                      </div>
                      <span className="text-xs text-fey-graphite">Acreedor: {debt.creditor}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-mono font-bold text-white block">
                        {formatPesos(debt.remainingAmount)}
                      </span>
                      <span className="text-[10px] text-fey-graphite">
                        Total original: {formatPesos(debt.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Etiquetas de consecuencia y reservas */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {getConsequencePill(debt.consequenceType)}
                    {isReserved && (
                      <span className="text-[10px] font-semibold text-fey-growth bg-fey-growth/10 border border-fey-growth/30 px-2 py-0.5 rounded-full">
                        ✓ Fondos Reservados
                      </span>
                    )}
                  </div>

                  {/* Barra de Amortización */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[11px] text-fey-graphite">
                      <span>Progreso de pago</span>
                      <span>{paidPct}% ({formatPesos(debt.totalAmount - debt.remainingAmount)} abonado)</span>
                    </div>
                    <div className="w-full bg-[#0b0b0b] rounded-full h-1.5 border border-[#222222] overflow-hidden">
                      <div
                        className="bg-fey-growth h-full rounded-full transition-all duration-300"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Info de vencimiento y tasa */}
                  <div className="mt-3 pt-2.5 border-t border-[#262626] flex items-center justify-between text-xs text-fey-graphite">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-fey-mist" />
                      Vence: <strong className="text-white">{debt.dueDate}</strong>
                    </span>

                    {debt.interestRateKnown && (
                      <span className="text-[11px] text-fey-ember">
                        {debt.interestRateKnown}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botonera de Acciones Fey */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#262626]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setDebtToEdit(debt);
                        setIsAddModalOpen(true);
                      }}
                      title="Editar deuda"
                      className="p-1.5 text-fey-graphite hover:text-white rounded-full transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(debt.id, debt.name)}
                      title="Eliminar deuda"
                      className="p-1.5 text-fey-graphite hover:text-red-400 rounded-full transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {debt.status !== 'paid' && debt.remainingAmount > 0 && (
                    <button
                      onClick={() => setDebtToPay(debt)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#131313] hover:bg-[#222222] text-white border border-[#333333] transition shadow-fey-button active:scale-95"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pagar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <DebtModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setDebtToEdit(null);
        }}
        debtToEdit={debtToEdit}
      />

      {/* Modal de Pago */}
      <DebtPaymentModal
        isOpen={Boolean(debtToPay)}
        onClose={() => setDebtToPay(null)}
        debt={debtToPay}
        accounts={accounts}
      />
    </div>
  );
};
