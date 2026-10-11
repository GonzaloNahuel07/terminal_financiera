import React, { useState } from 'react';
import { Plus, Calendar, CheckCircle2, Trash2, Edit2, CreditCard } from 'lucide-react';
import type { RecurringObligation, Account, VirtualReserve } from '../../types';
import { formatPesos } from '../../utils/money';
import { deleteRecurringTemplate, payRecurringObligation } from '../../services/recurringService';
import { RecurringModal } from './RecurringModal';

interface RecurringListProps {
  recurring: RecurringObligation[];
  accounts: Account[];
  reserves: VirtualReserve[];
}

export const RecurringList: React.FC<RecurringListProps> = ({
  recurring,
  accounts,
  reserves
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<RecurringObligation | null>(null);
  const [payingTemplate, setPayingTemplate] = useState<RecurringObligation | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalMonthlyCommitment = recurring
    .filter((r) => !r.isDeleted && r.isActive)
    .reduce((acc, r) => acc + r.expectedAmount, 0);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Dar de baja la plantilla periódica "${name}"?`)) {
      await deleteRecurringTemplate(id);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payingTemplate || !selectedAccountId) return;
    try {
      setIsSubmitting(true);
      await payRecurringObligation({
        recurringId: payingTemplate.id,
        accountId: selectedAccountId,
        amount: payingTemplate.expectedAmount,
        date: paymentDate
      });
      setPayingTemplate(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityPill = (p: RecurringObligation['priority']) => {
    switch (p) {
      case 1:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fey-ember/15 text-fey-ember border border-fey-ember/30">
            P1 • Vital
          </span>
        );
      case 2:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            P2 • Esencial
          </span>
        );
      case 3:
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#131313] text-fey-mist border border-[#333333]">
            P3 • Importante
          </span>
        );
      case 4:
      case 5:
      default:
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#131313] text-fey-graphite border border-[#222222]">
            P{p} • Prescindible
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-fey-heading text-white">
            Gastos Fijos y Recurrentes
          </h2>
          <p className="text-xs text-fey-graphite">
            Compromiso mensual estimado: <strong className="text-white font-mono">{formatPesos(totalMonthlyCommitment)}</strong>
          </p>
        </div>

        <button
          onClick={() => {
            setTemplateToEdit(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          Nueva Obligación Fija
        </button>
      </div>

      {recurring.length === 0 ? (
        <div className="bg-[#191919] border border-[#2a2a2a] rounded-2xl p-8 text-center shadow-fey-card">
          <CheckCircle2 className="w-10 h-10 text-fey-growth mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold text-white">No tenés gastos periódicos configurados.</p>
          <p className="text-xs text-fey-graphite mt-1">Creá plantillas de alquiler, internet o servicios para planificar tus semanas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {recurring.map((rec) => {
            const isReserved = reserves.some((r) => r.targetId === rec.id && r.status === 'active');

            return (
              <div
                key={rec.id}
                className="bg-[#191919] border border-[#262626] rounded-2xl p-4.5 shadow-fey-card flex flex-col justify-between space-y-4 relative fey-halo-hover"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm tracking-tight text-white">{rec.name}</h3>
                        {getPriorityPill(rec.priority)}
                      </div>
                      <span className="text-xs text-fey-graphite flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3 h-3 text-fey-mist" />
                        Vence día {rec.dueDay} • Ciclo {rec.frequency === 'monthly' ? 'Mensual' : rec.frequency}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-mono font-bold text-white block">
                        {formatPesos(rec.expectedAmount)}
                      </span>
                      <span className="text-[10px] text-fey-graphite">Importe previsto</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {isReserved ? (
                      <span className="text-[10px] font-semibold text-fey-growth bg-fey-growth/10 border border-fey-growth/30 px-2.5 py-0.5 rounded-full">
                        ✓ Reservado este ciclo
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-fey-graphite bg-[#131313] border border-[#222222] px-2.5 py-0.5 rounded-full">
                        ○ Sin reservar
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#262626]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setTemplateToEdit(rec);
                        setIsModalOpen(true);
                      }}
                      title="Editar plantilla"
                      className="p-1.5 text-fey-graphite hover:text-white rounded-full transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rec.id, rec.name)}
                      title="Eliminar plantilla"
                      className="p-1.5 text-fey-graphite hover:text-red-400 rounded-full transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setPayingTemplate(rec);
                      setSelectedAccountId(accounts[0]?.id ?? '');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#131313] hover:bg-[#222222] text-white border border-[#333333] transition shadow-fey-button active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Registrar Pago
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <RecurringModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTemplateToEdit(null);
        }}
        templateToEdit={templateToEdit}
      />

      {/* Modal Rápido de Pago Periódico */}
      {payingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#131313] border border-[#2a2a2a] rounded-2xl w-full max-w-sm p-6 shadow-fey-card text-white space-y-4">
            <h3 className="text-base font-bold tracking-tight text-white">
              Confirmar Pago: {payingTemplate.name}
            </h3>
            <p className="text-xs text-fey-graphite">
              Importe a debitar: <strong className="text-white font-mono">{formatPesos(payingTemplate.expectedAmount)}</strong>
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase mb-1">
                Cuenta de pago
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatPesos(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-fey-graphite uppercase mb-1">
                Fecha de pago
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setPayingTemplate(null)}
                className="px-4 py-2 rounded-full text-xs text-fey-graphite hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPayment}
                className="px-5 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Débito'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
