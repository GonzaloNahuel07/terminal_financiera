import React, { useState } from 'react';
import { Wallet, Landmark, Banknote, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { Account } from '../../types';
import { formatPesos } from '../../utils/money';
import { deleteAccount } from '../../services/accountService';
import { AccountModal } from './AccountModal';

interface AccountListProps {
  accounts: Account[];
}

export const AccountList: React.FC<AccountListProps> = ({ accounts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'bank':
        return <Landmark className="w-5 h-5 text-blue-400" />;
      case 'cash':
        return <Banknote className="w-5 h-5 text-fey-growth" />;
      case 'wallet':
      default:
        return <Wallet className="w-5 h-5 text-fey-signal" />;
    }
  };

  const getTypeName = (type: Account['type']) => {
    switch (type) {
      case 'bank':
        return 'Cuenta Bancaria';
      case 'cash':
        return 'Efectivo';
      case 'wallet':
        return 'Billetera Virtual';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de dar de baja la cuenta "${name}"? Los movimientos históricos se conservarán.`)) {
      await deleteAccount(id);
      setMenuOpenId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-fey-display text-white">
            Tus Cuentas.
          </h2>
          <p className="text-xs text-fey-graphite">
            Distribución de saldos reales por entidad y custodia
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedAccount(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-[#141414] border border-[#242424] rounded-2xl p-4.5 shadow-fey-card fey-halo-hover relative flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0b0b0b] border border-[#242424]">
                  {getAccountIcon(acc.type)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white tracking-tight">{acc.name}</h3>
                  <span className="text-xs text-fey-graphite">{getTypeName(acc.type)}</span>
                </div>
              </div>

              {/* Menú de opciones */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === acc.id ? null : acc.id)}
                  className="p-1.5 text-fey-graphite hover:text-white rounded-lg hover:bg-[#222222] transition"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpenId === acc.id && (
                  <div className="absolute right-0 top-7 w-36 bg-[#141414] border border-[#282828] rounded-xl shadow-fey-modal py-1 z-20">
                    <button
                      onClick={() => {
                        setSelectedAccount(acc);
                        setIsModalOpen(true);
                        setMenuOpenId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-fey-mist hover:text-white hover:bg-[#222222] flex items-center gap-2 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-fey-graphite" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id, acc.name)}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-[#222222] flex items-center gap-2 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Dar de baja
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#222222] flex items-baseline justify-between">
              <span className="text-xs text-fey-graphite">Saldo Disponible</span>
              <span className="text-lg font-mono font-bold text-white">
                {formatPesos(acc.currentBalance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAccount(null);
        }}
        accountToEdit={selectedAccount}
      />
    </div>
  );
};
