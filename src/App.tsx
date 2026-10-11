import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Wifi, WifiOff, Wallet, Layers, History } from 'lucide-react';
import { db } from './db';
import { initializeDefaultAccountsIfNeeded } from './services/accountService';
import {
  calculateTotalRealBalance,
  calculateTotalActiveReserves,
  calculateFreeBalance
} from './core/calculator';
import { SummaryHeader } from './components/SummaryHeader';
import { AccountList } from './components/Accounts/AccountList';
import { TransactionList } from './components/Transactions/TransactionList';
import { TransactionModal } from './components/Transactions/TransactionModal';
import type { Transaction } from './types';

export const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'all' | 'accounts' | 'transactions'>('all');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  // Monitoreo de conectividad de red
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Inicializar cuentas por defecto si está vacío
    initializeDefaultAccountsIfNeeded();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Consultas reactivas en tiempo real a IndexedDB (Dexie)
  const accounts = useLiveQuery(
    () => db.accounts.filter((a) => !a.isDeleted && a.isActive).toArray(),
    []
  ) ?? [];

  const transactions = useLiveQuery(
    () => db.transactions.filter((tx) => !tx.isDeleted).toArray(),
    []
  ) ?? [];

  const reserves = useLiveQuery(
    () => db.virtualReserves.filter((r) => r.status === 'active').toArray(),
    []
  ) ?? [];

  const pendingSyncCount = useLiveQuery(
    () => db.syncOutbox.filter((s) => s.syncStatus === 'pending').count(),
    []
  ) ?? 0;

  // Cálculos contables puros en tiempo real
  const totalRealBalance = calculateTotalRealBalance(accounts, transactions);
  const totalReserves = calculateTotalActiveReserves(reserves);
  const freeBalance = calculateFreeBalance(totalRealBalance, totalReserves);

  // Ordenar transacciones por fecha descendente
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barra de Navegación Superior */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                Asistente Financiero
              </h1>
              <p className="text-[11px] text-slate-400">PWA Offline-First • ARS Pesos</p>
            </div>
          </div>

          {/* Indicadores de Conexión y Cola Outbox */}
          <div className="flex items-center gap-2">
            {pendingSyncCount > 0 && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {pendingSyncCount} pendientes de sync
              </span>
            )}

            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">En línea</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Encabezado con Métricas Financieras */}
        <SummaryHeader
          totalRealBalance={totalRealBalance}
          totalReserves={totalReserves}
          freeBalance={freeBalance}
          onNewTransaction={() => {
            setTxToEdit(null);
            setIsTxModalOpen(true);
          }}
        />

        {/* Pestañas de Navegación Rápida */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Vista General
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'accounts'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Cuentas ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'transactions'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Historial ({transactions.length})
          </button>
        </div>

        {/* Sección de Cuentas */}
        {(activeTab === 'all' || activeTab === 'accounts') && (
          <section className="space-y-4">
            <AccountList accounts={accounts} />
          </section>
        )}

        {/* Sección de Movimientos */}
        {(activeTab === 'all' || activeTab === 'transactions') && (
          <section className="space-y-4 pt-2">
            <TransactionList
              transactions={sortedTransactions}
              accounts={accounts}
              onEditTransaction={(tx) => {
                setTxToEdit(tx);
                setIsTxModalOpen(true);
              }}
            />
          </section>
        )}
      </main>

      {/* Modal de Transacciones */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setTxToEdit(null);
        }}
        accounts={accounts}
        transactionToEdit={txToEdit}
      />

      {/* Pie de Página */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Asistente Financiero Personal PWA • Módulo 3: Cuentas y Movimientos Activo
      </footer>
    </div>
  );
};

export default App;
