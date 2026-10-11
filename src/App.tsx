import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Wifi,
  WifiOff,
  Wallet,
  LayoutDashboard,
  History,
  Coins,
  ShieldAlert,
  Layers,
  BarChart3,
  Target,
  Clock,
  Cloud
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
import { DebtsAndRecurringView } from './components/DebtsAndRecurringView';
import { ReservesCenter } from './components/Reserves/ReservesCenter';
import { VisualDashboard } from './components/Analytics/VisualDashboard';
import { SavingsList } from './components/Savings/SavingsList';
import { WeeklyPlanView } from './components/WeeklyPlan/WeeklyPlanView';
import { SyncModal } from './components/Sync/SyncModal';
import { triggerFullSync } from './services/syncService';
import type { Transaction } from './types';

export const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reserves' | 'accounts' | 'debts' | 'transactions' | 'analytics' | 'savings' | 'weekly'>('dashboard');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isDailyIncomeModalOpen, setIsDailyIncomeModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  // Monitoreo de conectividad y sincronización automática
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerFullSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Inicializar cuentas por defecto si está vacío
    initializeDefaultAccountsIfNeeded();

    // Sincronización inicial y periódica cada 60s si está online
    if (navigator.onLine) {
      triggerFullSync();
    }
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        triggerFullSync();
      }
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
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

  const weeklyPlans = useLiveQuery(
    () => db.weeklyPlans.toArray(),
    []
  ) ?? [];

  const pendingSyncCount = useLiveQuery(
    () => db.syncOutbox.filter((s) => s.syncStatus === 'pending').count(),
    []
  ) ?? 0;

  const outboxItems = useLiveQuery(
    () => db.syncOutbox.toArray(),
    []
  ) ?? [];

  // Cálculos contables puros en tiempo real
  const totalRealBalance = calculateTotalRealBalance(accounts, transactions);
  const totalReserves = calculateTotalActiveReserves(reserves);
  const freeBalance = calculateFreeBalance(totalRealBalance, totalReserves);

  // Ordenar transacciones por fecha descendente
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Barra de Navegación Superior Estilo Fey */}
      <header className="border-b border-[#1f1f1f] bg-[#0b0b0b]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#191919] border border-[#2a2a2a] text-white shadow-fey-button">
              <Wallet className="w-4 h-4 text-fey-mist" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-fey-heading text-white leading-tight">
                  Terminal Financiera
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-fey-graphite px-2 py-0.5 rounded-full border border-[#222222]">
                  ARS • Calibre
                </span>
              </div>
              <p className="text-[11px] text-fey-graphite">Gestión de Liquidez y Compromisos</p>
            </div>
          </div>

          {/* Acciones Rápidas Fey (99px Pills) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsDailyIncomeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-fey-pale font-bold text-xs transition shadow-fey-button active:scale-95"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>+ Cobro Diario</span>
            </button>

            {/* Botón de Sincronización y Outbox */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                pendingSyncCount > 0
                  ? 'bg-[#201411] text-fey-ember border-[#482218] hover:bg-[#2c1a16]'
                  : 'bg-[#141414] text-fey-mist border-[#242424] hover:text-white hover:border-[#383838]'
              }`}
              title="Abrir estado de sincronización y configuración de Supabase"
            >
              <Cloud className="w-3.5 h-3.5 text-fey-signal" />
              {pendingSyncCount > 0 ? (
                <span>{pendingSyncCount} en cola</span>
              ) : (
                <span className="hidden sm:inline">Nube</span>
              )}
            </button>

            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-fey-graphite border border-[#222222]">
                <Wifi className="w-3.5 h-3.5 text-fey-growth" />
                <span className="hidden sm:inline text-white">Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-fey-ember bg-fey-ember/10 border border-fey-ember/30">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
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

        {/* Pestañas de Navegación Fey (Pills con acento Fey Signal) */}
        <nav className="flex items-center gap-1.5 sm:gap-2 border-b border-[#1f1f1f] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'bg-[#191919] text-white border-b-2 border-fey-signal shadow-fey-halo'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('reserves')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'reserves'
                ? 'bg-[#191919] text-white border-b-2 border-fey-signal shadow-fey-halo'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-fey-growth" />
            Centro de Reservas ({reserves.length})
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'accounts'
                ? 'bg-[#191919] text-white border-b-2 border-fey-signal shadow-fey-halo'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Cuentas ({accounts.length})
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'debts'
                ? 'bg-[#191919] text-white border-b-2 border-fey-signal shadow-fey-halo'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-fey-ember" />
            Deudas y Gastos Fijos ({debts.length + recurring.length})
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'transactions'
                ? 'bg-[#191919] text-white border-b-2 border-fey-signal shadow-fey-halo'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Movimientos ({transactions.length})
          </button>

          <button
            onClick={() => setActiveTab('savings')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'savings'
                ? 'bg-[#191919] text-white border-b-2 border-fey-signal shadow-fey-halo'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-fey-growth" />
            Ahorro & Metas ({savingsGoals.length})
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'analytics'
                ? 'bg-[#191919] text-white border-b-2 border-fey-signal shadow-fey-halo'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-fey-signal" />
            Dashboards Visuales
          </button>

          <button
            onClick={() => setActiveTab('weekly')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'weekly'
                ? 'bg-[#191919] text-white border-b-2 border-fey-signal shadow-fey-halo'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-fey-signal" />
            Plan Semanal
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

        {/* Vista 2: Centro de Reservas (Módulo 6) */}
        {activeTab === 'reserves' && (
          <section className="space-y-4">
            <ReservesCenter
              reserves={reserves}
              debts={debts}
              recurring={recurring}
              savingsGoals={savingsGoals}
              totalRealBalance={totalRealBalance}
              freeBalance={freeBalance}
            />
          </section>
        )}

        {/* Vista 3: Sección de Cuentas */}
        {activeTab === 'accounts' && (
          <section className="space-y-4">
            <AccountList accounts={accounts} />
          </section>
        )}

        {/* Vista 4: Deudas y Gastos Fijos */}
        {activeTab === 'debts' && (
          <section className="space-y-4">
            <DebtsAndRecurringView
              debts={debts}
              recurring={recurring}
              accounts={accounts}
              reserves={reserves}
            />
          </section>
        )}

        {/* Vista 5: Historial de Movimientos */}
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

        {/* Vista 6: Ahorro y Fondo de Emergencia (Módulo 7) */}
        {activeTab === 'savings' && (
          <section className="space-y-4">
            <SavingsList
              savingsGoals={savingsGoals}
              freeBalance={freeBalance}
              recurring={recurring}
            />
          </section>
        )}

        {/* Vista 7: Dashboards Visuales y Analítica */}
        {activeTab === 'analytics' && (
          <section className="space-y-4">
            <VisualDashboard
              transactions={sortedTransactions}
              accounts={accounts}
              debts={debts}
              savingsGoals={savingsGoals}
              reserves={reserves}
            />
          </section>
        )}

        {/* Vista 8: Plan Semanal y Cierre de Ciclos (Módulo 8) */}
        {activeTab === 'weekly' && (
          <section className="space-y-4">
            <WeeklyPlanView
              weeklyPlans={weeklyPlans}
              debts={debts}
              recurring={recurring}
            />
          </section>
        )}
      </main>

      {/* Modales */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setTxToEdit(null);
        }}
        accounts={accounts}
        transactionToEdit={txToEdit}
      />

      <DailyIncomeModal
        isOpen={isDailyIncomeModalOpen}
        onClose={() => setIsDailyIncomeModalOpen(false)}
        accounts={accounts}
      />

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isOnline={isOnline}
        outboxItems={outboxItems}
      />

      {/* Pie de Página */}
      <footer className="border-t border-[#1f1f1f] py-5 px-4 text-center text-xs text-fey-graphite">
        Terminal Financiera Personal • Estética Nocturna Fey • Módulo 9: Sincronización Segura Supabase & Outbox Offline-First
      </footer>
    </div>
  );
};

export default App;
