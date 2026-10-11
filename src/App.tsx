import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, ShieldCheck, Wallet, RefreshCw } from 'lucide-react';
import { formatPesos } from './utils/money';

export const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barra de Navegación Superior */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Asistente Financiero
              </h1>
              <p className="text-xs text-slate-400">PWA Inteligente • Pesos Argentinos (ARS)</p>
            </div>
          </div>

          {/* Indicador de Conectividad Offline / Online */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wifi className="w-3.5 h-3.5" />
                <span>En línea</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Modo Offline (Local)</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner de Estado del Sistema */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800/60 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Módulo 1 Activo
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Base Arquitectónica y Persistencia Local
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                El entorno PWA, la base de datos local Dexie (IndexedDB), el soporte offline y las reglas contables en pesos enteros están configurados y listos.
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 w-full sm:w-auto text-right">
              <span className="text-xs text-slate-400 block">Formato ARS (Enteros)</span>
              <span className="text-xl font-mono font-bold text-emerald-400">
                {formatPesos(15400)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Motor Dexie.js (IndexedDB) activo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Service Worker PWA preparado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Cero decimales IEEE-754 garantizado</span>
            </div>
          </div>
        </section>

        {/* Panel de Próximos Pasos */}
        <section className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800">
          <h3 className="text-base font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            Siguiente Módulo Planificado: Modelo de Datos y Reglas de Cálculo Financiero
          </h3>
          <p className="text-sm text-slate-400">
            En el Módulo 2 implementaremos y testearemos de forma exhaustiva el motor financiero puro: cálculo de saldo real consolidado, reservas virtuales, saldo libre, prevención de sobre-asignación y priorización inteligente.
          </p>
        </section>
      </main>

      {/* Pie de Página */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Asistente Financiero Personal PWA • Diseñado para control financiero en ARS
      </footer>
    </div>
  );
};

export default App;
