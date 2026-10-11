import React from 'react';
import { X, Command } from 'lucide-react';

interface TerminalShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TerminalShortcutsModal: React.FC<TerminalShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'C o +', label: 'Registrar Cobro Diario', desc: 'Abre el asistente de ingreso y sugerencias' },
    { key: 'M', label: 'Nuevo Movimiento', desc: 'Registra un gasto, ingreso o transferencia' },
    { key: 'A', label: 'Auditoría & Backup', desc: 'Diagnóstico contable, auto-reparación y respaldos' },
    { key: 'S', label: 'Sincronización Nube', desc: 'Estado de conexión y cola offline de Supabase' },
    { key: 'P', label: 'Exportar Reporte PDF', desc: 'Genera balance ejecutivo para imprimir o guardar' },
    { key: 'E', label: 'Exportar CSV (Excel)', desc: 'Descarga todas las transacciones en UTF-8' },
    { key: '1', label: 'Pestaña: Dashboard', desc: 'Vista principal de liquidez y resumen' },
    { key: '2', label: 'Pestaña: Reservas', desc: 'Centro de asignación virtual de liquidez' },
    { key: '3', label: 'Pestaña: Cuentas', desc: 'Gestión de saldos bancarios y billeteras' },
    { key: '4', label: 'Pestaña: Deudas', desc: 'Pasivos y obligaciones recurrentes' },
    { key: '5', label: 'Pestaña: Movimientos', desc: 'Historial completo de transacciones' },
    { key: '6', label: 'Pestaña: Ahorro', desc: 'Metas y fondo de emergencia' },
    { key: '7', label: 'Pestaña: Gráficos', desc: 'Dashboards analíticos de evolución' },
    { key: '8', label: 'Pestaña: Plan Semanal', desc: 'Planificación de 7 días y análisis de brecha' },
    { key: '?', label: 'Ayuda de Atajos', desc: 'Muestra u oculta esta guía de navegación rápida' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#12141c] border border-[#242b38] rounded-2xl w-full max-w-lg p-6 shadow-fey-card relative text-white max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-fey-graphite hover:text-white p-1 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-spider-cobalt/15 text-spider-electric border border-spider-cobalt/30">
            <Command className="w-4 h-4" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-spider-electric">
            Navegación Terminal Táctica
          </span>
        </div>
        <h3 className="text-lg font-bold tracking-fey-heading text-white mb-2">
          Atajos de Teclado Rápidos
        </h3>
        <p className="text-xs text-fey-graphite mb-4">
          Navegá toda la terminal financiera sin usar el ratón desde cualquier computadora.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="p-2.5 rounded-xl bg-[#161a25] border border-[#262d3d] flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-bold text-white block">{s.label}</span>
                <span className="text-[11px] text-fey-graphite">{s.desc}</span>
              </div>
              <kbd className="px-2.5 py-1 rounded-md bg-[#08090c] border border-[#2e3748] text-batman-gold font-mono font-bold text-xs shrink-0 shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#242b38] text-center text-xs text-fey-graphite mt-2">
          Presioná <kbd className="px-1.5 py-0.5 rounded bg-[#08090c] text-white">ESC</kbd> o hacé clic afuera para cerrar
        </div>
      </div>
    </div>
  );
};
