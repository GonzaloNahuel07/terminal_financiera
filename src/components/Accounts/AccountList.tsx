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
        return <Banknote className="w-5 h-5 text-emerald-400" />;
      case 'wallet':
      default:
        return <Wallet className="w-5 h-5 text-violet-400" />;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Tus Cuentas</h2>
          <p className="text-xs text-slate-400">Distribución de saldos reales por origen</p>
        </div>
        <button
          onClick={() => {
            setSelectedAccount(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition relative flex flex-col justify-between shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  {getAccountIcon(acc.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">{acc.name}</h3>
                  <span className="text-xs text-slate-500">{getTypeName(acc.type)}</span>
                </div>
              </div>

              {/* Menú de opciones */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === acc.id ? null : acc.id)}
                  className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpenId === acc.id && (
                  <div className="absolute right-0 top-7 w-36 bg-slate-950 border border-slate-800 rounded-xl shadow-xl py-1 z-20">
                    <button
                      onClick={() => {
                        setSelectedAccount(acc);
                        setIsModalOpen(true);
                        setMenuOpenId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id, acc.name)}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Dar de baja
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Saldo Disponible</span>
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
