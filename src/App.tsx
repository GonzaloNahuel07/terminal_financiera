import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Wifi,
  WifiOff,
  Wallet,
  LayoutDashboard,
  History,
  Coins
} from 'lucide-react';
import { db } from './db';
import { initializeDefaultAccountsIfNeeded } from './services/accountService';
import {
  calculateTotalRealBalance,
  calculateTotalActiveReserves,
  calculateFreeBalance
} from './core/calculator';
import { SummaryHeader } from './components/SummaryHeader';
import { Dashboard } from './components/Dashboard/Dashboard';
import { AccountList } from './components/Accounts/AccountList';
import { TransactionList } from './components/Transactions/TransactionList';
import { TransactionModal } from './components/Transactions/TransactionModal';
import { DailyIncomeModal } from './components/Income/DailyIncomeModal';
import type { Transaction } from './types';

export const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions'>('dashboard');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isDailyIncomeModalOpen, setIsDailyIncomeModalOpen] = useState(false);
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

  const debts = useLiveQuery(
    () => db.debts.filter((d) => !d.isDeleted).toArray(),
    []
  ) ?? [];

  const recurring = useLiveQuery(
    () => db.recurringObligations.filter((r) => !r.isDeleted).toArray(),
    []
  ) ?? [];

  const savingsGoals = useLiveQuery(
    () => db.savingsGoals.filter((g) => !g.isDeleted).toArray(),
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
              <p className="text-[11px] text-slate-400">PWA Inteligente • Pesos Argentinos (ARS)</p>
            </div>
          </div>

          {/* Acciones Rápidas y Conectividad */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDailyIncomeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>+ Cobro Diario</span>
            </button>

            {pendingSyncCount > 0 && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {pendingSyncCount} en cola
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

        {/* Pestañas de Navegación Principal */}
        <nav className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'accounts'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Cuentas ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'transactions'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            Movimientos ({transactions.length})
          </button>
        </nav>

        {/* Vista 1: Dashboard Principal */}
        {activeTab === 'dashboard' && (
          <Dashboard
            accounts={accounts}
            transactions={sortedTransactions}
            debts={debts}
            recurring={recurring}
            savingsGoals={savingsGoals}
            reserves={reserves}
            totalRealBalance={totalRealBalance}
            freeBalance={freeBalance}
            onOpenDailyIncomeModal={() => setIsDailyIncomeModalOpen(true)}
            onOpenTransactionModal={() => {
              setTxToEdit(null);
              setIsTxModalOpen(true);
            }}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* Vista 2: Sección de Cuentas */}
        {activeTab === 'accounts' && (
          <section className="space-y-4">
            <AccountList accounts={accounts} />
          </section>
        )}

        {/* Vista 3: Sección de Historial de Movimientos */}
        {activeTab === 'transactions' && (
          <section className="space-y-4">
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

      {/* Modal de Transacciones Estándar */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setTxToEdit(null);
        }}
        accounts={accounts}
        transactionToEdit={txToEdit}
      />

      {/* Modal de Cobro Diario Variable con Asistente */}
      <DailyIncomeModal
        isOpen={isDailyIncomeModalOpen}
        onClose={() => setIsDailyIncomeModalOpen(false)}
        accounts={accounts}
      />

      {/* Pie de Página */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Asistente Financiero Personal PWA • Módulo 4: Ingresos Diarios y Dashboard Activo
      </footer>
    </div>
  );
};

export default App;
