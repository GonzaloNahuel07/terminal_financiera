import React, { useState } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Settings,
  Database
} from 'lucide-react';
import type { SyncOutboxItem } from '../../types';
import {
  triggerFullSync,
  retryFailedSyncItems
} from '../../services/syncService';
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseAnonKey,
  setCustomSupabaseCredentials,
  clearCustomSupabaseCredentials
} from '../../supabase/client';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  outboxItems: SyncOutboxItem[];
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  outboxItems
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Formulario de credenciales
  const [showConfig, setShowConfig] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(getSupabaseUrl());
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(getSupabaseAnonKey());
  const [configSavedMessage, setConfigSavedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const configured = isSupabaseConfigured();
  const failedItems = outboxItems.filter((i) => i.syncStatus === 'failed');

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const result = await triggerFullSync();
      if (result.success) {
        setSyncFeedback({
          success: true,
          message: `Sincronización exitosa: ${result.pushed} enviados, ${result.pulled} descargados.`
        });
      } else {
        setSyncFeedback({
          success: false,
          message: result.error || 'La sincronización no pudo completarse.'
        });
      }
    } catch (err) {
      setSyncFeedback({
        success: false,
        message: err instanceof Error ? err.message : 'Error al conectar con la nube.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      await retryFailedSyncItems();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
      setCustomSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
      setConfigSavedMessage('¡Credenciales guardadas con éxito!');
      setTimeout(() => setConfigSavedMessage(null), 3000);
    }
  };

  const handleResetCredentials = () => {
    clearCustomSupabaseCredentials();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setConfigSavedMessage('Credenciales restablecidas a valores por defecto.');
    setTimeout(() => setConfigSavedMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[#282828] w-full max-w-xl rounded-2xl p-6 shadow-fey-modal space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1b2535] border border-[#2c3d59] flex items-center justify-center text-fey-signal">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-fey-heading text-white">
                Sincronización y Estado Offline
              </h3>
              <p className="text-xs text-fey-graphite">
                Gestión de la bandeja outbox y conectividad con Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-fey-graphite hover:text-white rounded-full hover:bg-[#222222] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {syncFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              syncFeedback.success
                ? 'bg-[#12241a] border-[#224832] text-fey-growth'
                : 'bg-[#241414] border-[#441a1a] text-red-300'
            }`}
          >
            {syncFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
        )}

        {/* Tarjetas de Diagnóstico Rápido */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-[#0b0b0b] rounded-xl border border-[#242424] space-y-1">
            <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold">
              Red Local
            </span>
            <div className="flex items-center gap-2 mt-1">
              {isOnline ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-fey-growth shadow-fey-growth-glow inline-block" />
                  <span className="font-semibold text-white">Conectado (Online)</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-fey-ember inline-block" />
                  <span className="font-semibold text-fey-ember">Sin Conexión (Offline)</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-[#0b0b0b] rounded-xl border border-[#242424] space-y-1">
            <span className="text-[10px] text-fey-graphite uppercase tracking-wider block font-semibold">
              Nube Supabase
            </span>
            <div className="flex items-center gap-2 mt-1">
              {configured ? (
                <>
                  <Cloud className="w-4 h-4 text-fey-signal" />
                  <span className="font-semibold text-white">Credenciales Activas</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-4 h-4 text-fey-graphite" />
                  <span className="font-semibold text-fey-graphite">Modo Local (Sin cuenta)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sección de la Cola Outbox */}
        <div className="p-4 bg-[#0b0b0b] rounded-xl border border-[#242424] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-fey-signal" />
                Bandeja de Mutaciones Salientes (Outbox)
              </h4>
              <p className="text-xs text-fey-graphite">
                {outboxItems.length === 0
                  ? 'Todas las operaciones están 100% sincronizadas.'
                  : `${outboxItems.length} cambio(s) guardado(s) localmente en espera de replicación.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {failedItems.length > 0 && (
                <button
                  onClick={handleRetryFailed}
                  disabled={isSyncing || !isOnline}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#2a1414] text-red-300 border border-[#441a1a] hover:bg-[#381a1a] transition disabled:opacity-50"
                >
                  Reintentar Fallidos ({failedItems.length})
                </button>
              )}

              <button
                onClick={handleSyncNow}
                disabled={isSyncing || !isOnline || !configured}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-black hover:bg-fey-pale transition shadow-fey-button disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
              </button>
            </div>
          </div>

          {/* Lista de cambios pendientes */}
          {outboxItems.length > 0 && (
            <div className="max-h-44 overflow-y-auto space-y-1.5 pt-2 border-t border-[#1f1f1f]">
              {outboxItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-[#141414] rounded-lg border border-[#242424] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white block capitalize">
                      {item.action}: {item.entityName.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-fey-smoke block">
                      {item.createdAt.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      item.syncStatus === 'failed'
                        ? 'bg-[#2a1414] text-red-300 border border-[#441a1a]'
                        : item.syncStatus === 'syncing'
                        ? 'bg-[#152336] text-fey-signal border border-[#23426e]'
                        : 'bg-[#191919] text-fey-graphite border border-[#282828]'
                    }`}
                  >
                    {item.syncStatus}
                  </span>
                </div>
              ))}
              {outboxItems.length > 10 && (
                <p className="text-[10px] text-fey-graphite text-center pt-1">
                  ...y {outboxItems.length - 10} elementos más en cola
                </p>
              )}
            </div>
          )}
        </div>

        {/* Desplegable de Configuración de Supabase */}
        <div className="border-t border-[#222222] pt-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center justify-between w-full text-xs font-semibold text-fey-mist hover:text-white py-1 transition"
          >
            <span className="flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-fey-graphite" />
              Configurar Conexión con Supabase (Opcional)
            </span>
            <span className="text-[11px] text-fey-graphite">{showConfig ? 'Ocultar' : 'Configurar'}</span>
          </button>

          {showConfig && (
            <form onSubmit={handleSaveCredentials} className="space-y-3 pt-3">
              {configSavedMessage && (
                <div className="p-2.5 bg-[#12241a] border border-[#224832] rounded-xl text-xs text-fey-growth">
                  {configSavedMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1">
                  Project URL de Supabase
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-fey-graphite focus:outline-none focus:border-fey-signal transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fey-mist uppercase tracking-wider mb-1">
                  Anon / Public API Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full bg-[#0b0b0b] border border-[#282828] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-fey-graphite focus:outline-none focus:border-fey-signal transition"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResetCredentials}
                  className="text-[11px] text-fey-graphite hover:text-red-400 transition"
                >
                  Restablecer
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-white text-black font-bold text-xs rounded-full hover:bg-fey-pale transition shadow-fey-button"
                >
                  Guardar Credenciales
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
