import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  Database,
  Wrench,
  FileCheck
} from 'lucide-react';
import {
  performFinancialAudit,
  autoRepairFinancialInconsistencies,
  type AuditReport
} from '../../services/auditService';
import {
  downloadBackupFile,
  restoreFromBackup,
  validateBackupJson
} from '../../services/backupService';
import { formatPesos } from '../../utils/money';

interface AuditBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditBackupModal: React.FC<AuditBackupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'backup'>('audit');
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

  // Estados de Backup
  const [isExporting, setIsExporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importedJson, setImportedJson] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importValidation, setImportValidation] = useState<{
    isValid: boolean;
    error?: string;
    counts?: Record<string, number>;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);

  const loadAudit = async () => {
    try {
      setIsLoadingAudit(true);
      const rep = await performFinancialAudit();
      setReport(rep);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAudit();
      setRepairMsg(null);
      setRestoreSuccessMsg(null);
      setRestoreErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAutoRepair = async () => {
    try {
      setIsLoadingAudit(true);
      const res = await autoRepairFinancialInconsistencies();
      if (res.repairedCount > 0) {
        setRepairMsg(`Se corrigieron ${res.repairedCount} inconsistencia(s): ${res.actionsPerformed.join(' • ')}`);
      } else {
        setRepairMsg('No se encontraron inconsistencias que requieran corrección.');
      }
      await loadAudit();
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadBackupFile();
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setRestoreSuccessMsg(null);
    setRestoreErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportedJson(content);
      const val = validateBackupJson(content);
      if (val.isValid && val.payload) {
        setImportValidation({
          isValid: true,
          counts: val.payload.counts as unknown as Record<string, number>
        });
      } else {
        setImportValidation({
          isValid: false,
          error: val.error
        });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyRestore = async () => {
    if (!importedJson) return;

    const confirmText =
      importMode === 'replace'
        ? 'ATENCIÓN: El modo reemplazo borrará los datos actuales y cargará los del archivo. ¿Confirmar?'
        : 'Se combinarán los registros del archivo con los existentes. ¿Confirmar?';

    if (!confirm(confirmText)) return;

    try {
      setIsRestoring(true);
      setRestoreErrorMsg(null);
      const res = await restoreFromBackup(importedJson, importMode);
      setRestoreSuccessMsg(res.message);
      setImportedJson(null);
      setImportFileName(null);
      setImportValidation(null);
      await loadAudit();
    } catch (err) {
      setRestoreErrorMsg(err instanceof Error ? err.message : 'Error al restaurar');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#12141c] border border-[#242b38] rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-fey-card relative my-auto sm:my-6 text-white max-h-[92dvh] flex flex-col">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-fey-graphite hover:text-white p-1 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-batman-gold/10 text-batman-gold border border-batman-gold/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-batman-gold">
            Diagnóstico de Integridad • Gotham & Spider HUD
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold tracking-fey-heading text-white mb-3">
          Auditoría Contable & Respaldo de Datos
        </h2>

        {/* Pestañas de Navegación Modal */}
        <div className="flex items-center gap-2 border-b border-[#242b38] pb-3 mb-4">
          <button
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-[#1a1e2a] text-spider-electric border border-spider-electric/30 shadow-fey-cobalt-glow'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Salud Contable & Invariantes
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              activeTab === 'backup'
                ? 'bg-[#1a1e2a] text-batman-gold border border-batman-gold/30 shadow-fey-batman-glow'
                : 'text-fey-graphite hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Copia de Seguridad & Restauración
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab === 'audit' && (
            <>
              {/* Tarjeta de Score de Salud */}
              <div className="bg-[#161a25] border border-[#262d3d] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono font-bold text-lg border ${
                      (report?.score ?? 100) >= 90
                        ? 'bg-fey-growth/10 text-fey-growth border-fey-growth/30 shadow-fey-growth-glow'
                        : (report?.score ?? 100) >= 70
                        ? 'bg-batman-gold/10 text-batman-gold border-batman-gold/30'
                        : 'bg-spider-crimson/10 text-spider-crimson border-spider-crimson/30 shadow-fey-spider-glow'
                    }`}
                  >
                    <span>{report?.score ?? 100}%</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Índice de Salud Financiera & Motor Contable
                    </h3>
                    <p className="text-xs text-fey-graphite">
                      {report?.passedCount} verificaciones correctas • {report?.warningCount} advertencias • {report?.errorCount} errores
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={loadAudit}
                    disabled={isLoadingAudit}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[#12141c] border border-[#2b3342] text-xs font-medium text-fey-mist hover:text-white transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                    Reevaluar
                  </button>

                  <button
                    onClick={handleAutoRepair}
                    disabled={isLoadingAudit}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-batman-gold hover:text-black text-xs font-bold transition shadow-fey-button disabled:opacity-50"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Auto-Reparar
                  </button>
                </div>
              </div>

              {repairMsg && (
                <div className="p-3 bg-batman-gold/10 border border-batman-gold/30 rounded-xl text-batman-gold text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{repairMsg}</span>
                </div>
              )}

              {/* Métricas Contables del Motor */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#12141c] border border-[#222836] p-2.5 rounded-xl">
                  <span className="text-[10px] text-fey-graphite uppercase font-semibold block">Saldo Real</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {formatPesos(report?.metrics.totalRealBalance ?? 0)}
                  </span>
                </div>

                <div className="bg-[#12141c] border border-[#222836] p-2.5 rounded-xl">
                  <span className="text-[10px] text-spider-crimson uppercase font-semibold block">Reservas</span>
                  <span className="text-xs font-mono font-bold text-spider-crimson">
                    {formatPesos(report?.metrics.totalReserves ?? 0)}
                  </span>
                </div>

                <div className="bg-[#12141c] border border-[#222836] p-2.5 rounded-xl">
                  <span className="text-[10px] text-fey-growth uppercase font-semibold block">Saldo Libre</span>
                  <span className="text-xs font-mono font-bold text-fey-growth">
                    {formatPesos(report?.metrics.freeBalance ?? 0)}
                  </span>
                </div>

                <div className="bg-[#12141c] border border-[#222836] p-2.5 rounded-xl">
                  <span className="text-[10px] text-fey-graphite uppercase font-semibold block">Registros Totales</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {report?.metrics.totalRecords ?? 0} en Dexie
                  </span>
                </div>
              </div>

              {/* Lista de Verificaciones de Integridad */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-fey-mist uppercase tracking-wider">
                  Resultados del Chequeo de Invariantes
                </h4>

                {report?.checks.map((check) => (
                  <div
                    key={check.id}
                    className={`p-3 rounded-xl border flex items-start gap-3 transition ${
                      check.status === 'pass'
                        ? 'bg-[#12141c] border-[#222836]'
                        : check.status === 'warning'
                        ? 'bg-batman-gold/5 border-batman-gold/30'
                        : 'bg-spider-crimson/5 border-spider-crimson/30 shadow-fey-spider-glow'
                    }`}
                  >
                    {check.status === 'pass' && (
                      <CheckCircle2 className="w-4 h-4 text-fey-growth flex-shrink-0 mt-0.5" />
                    )}
                    {check.status === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-batman-gold flex-shrink-0 mt-0.5" />
                    )}
                    {check.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-spider-crimson flex-shrink-0 mt-0.5" />
                    )}

                    <div className="text-xs flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{check.title}</span>
                        {check.autoFixable && check.status !== 'pass' && (
                          <span className="text-[10px] font-semibold text-batman-gold bg-batman-gold/10 px-2 py-0.5 rounded-full border border-batman-gold/20">
                            Auto-reparable
                          </span>
                        )}
                      </div>
                      <p className="text-fey-mist mt-0.5">{check.message}</p>
                      {check.details && (
                        <p className="text-[11px] text-fey-graphite mt-1">{check.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Información de Cuota de Almacenamiento Local */}
              {report?.storageEstimate && (
                <div className="p-3 bg-[#12141c] border border-[#222836] rounded-xl flex items-center justify-between text-xs text-fey-graphite">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-spider-electric" />
                    <span>
                      Almacenamiento Local Ocupado:{' '}
                      <strong className="text-white">
                        {(report.storageEstimate.usageBytes / (1024 * 1024)).toFixed(2)} MB
                      </strong>
                    </span>
                  </div>
                  <span className="font-mono text-fey-mist">
                    {report.storageEstimate.usagePercent}% de cuota
                  </span>
                </div>
              )}
            </>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* Sección Exportar */}
              <div className="bg-[#161a25] border border-[#262d3d] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-spider-electric" />
                  <h3 className="text-sm font-bold text-white">Exportar Copia de Seguridad Completa</h3>
                </div>
                <p className="text-xs text-fey-graphite">
                  Descargá un archivo JSON con todas tus cuentas, movimientos, deudas, reservas, ahorros y planes semanales. Podés guardarlo como resguardo o transferirlo a otro dispositivo.
                </p>

                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black hover:bg-spider-electric hover:text-white font-bold text-xs transition shadow-fey-button disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExporting ? 'Generando archivo...' : 'Descargar Archivo JSON'}
                </button>
              </div>

              {/* Sección Importar / Restaurar */}
              <div className="bg-[#161a25] border border-[#262d3d] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-batman-gold" />
                  <h3 className="text-sm font-bold text-white">Restaurar Copia de Seguridad</h3>
                </div>
                <p className="text-xs text-fey-graphite">
                  Seleccioná un archivo JSON generado previamente para recuperar tu estado financiero.
                </p>

                {/* Input archivo */}
                <div>
                  <input
                    type="file"
                    accept=".json"
                    id="backup-file-input"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="backup-file-input"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#12141c] border border-[#2b3342] text-xs font-semibold text-fey-mist hover:text-white hover:border-[#3b82f6] cursor-pointer transition"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    {importFileName ? `Archivo: ${importFileName}` : 'Seleccionar Archivo JSON'}
                  </label>
                </div>

                {/* Validación del Archivo Seleccionado */}
                {importValidation && (
                  <div className="space-y-2">
                    {importValidation.isValid ? (
                      <div className="p-3 bg-fey-growth/10 border border-fey-growth/30 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-fey-growth font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Archivo válido y verificado</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[11px] text-fey-mist">
                          <span>Cuentas: {importValidation.counts?.accounts ?? 0}</span>
                          <span>Movimientos: {importValidation.counts?.transactions ?? 0}</span>
                          <span>Deudas: {importValidation.counts?.debts ?? 0}</span>
                          <span>Gastos Fijos: {importValidation.counts?.recurringObligations ?? 0}</span>
                          <span>Reservas: {importValidation.counts?.virtualReserves ?? 0}</span>
                          <span>Metas: {importValidation.counts?.savingsGoals ?? 0}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-spider-crimson/10 border border-spider-crimson/30 rounded-xl text-xs text-spider-crimson flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{importValidation.error}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Selector de Modo de Restauración */}
                {importValidation?.isValid && (
                  <div className="space-y-2 pt-2 border-t border-[#242b38]">
                    <span className="text-[11px] font-semibold text-fey-graphite uppercase tracking-wider block">
                      Método de Restauración
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          importMode === 'merge'
                            ? 'bg-[#1a1e2a] border-spider-electric text-white'
                            : 'bg-[#12141c] border-[#222836] text-fey-graphite'
                        }`}
                      >
                        <span className="text-xs font-bold block text-white">Fusión (Recomendado)</span>
                        <span className="text-[10px] text-fey-graphite block">
                          Agrega y actualiza registros sin borrar los actuales
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          importMode === 'replace'
                            ? 'bg-[#201418] border-spider-crimson text-white'
                            : 'bg-[#12141c] border-[#222836] text-fey-graphite'
                        }`}
                      >
                        <span className="text-xs font-bold block text-spider-crimson">Reemplazo Total</span>
                        <span className="text-[10px] text-fey-graphite block">
                          Limpia la base local e instala exactamente el archivo
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={handleApplyRestore}
                      disabled={isRestoring}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-batman-gold text-black hover:bg-amber-400 font-bold text-xs transition shadow-fey-batman-glow disabled:opacity-50 mt-2"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isRestoring ? 'Restaurando...' : 'Confirmar y Restaurar Base de Datos'}
                    </button>
                  </div>
                )}

                {restoreSuccessMsg && (
                  <div className="p-3 bg-fey-growth/10 border border-fey-growth/30 rounded-xl text-fey-growth text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{restoreSuccessMsg}</span>
                  </div>
                )}

                {restoreErrorMsg && (
                  <div className="p-3 bg-spider-crimson/10 border border-spider-crimson/30 rounded-xl text-spider-crimson text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{restoreErrorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="pt-3 border-t border-[#242b38] flex items-center justify-between text-xs text-fey-graphite">
          <span>Finance HUD Engine v1.0 • PWA Local-First</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#161a25] hover:bg-[#1e2332] text-white font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
