import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Si ya está ejecutándose como PWA instalada, no mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Verificar si el usuario lo descartó recientemente
    const dismissedUntil = localStorage.getItem('pwa_install_dismissed_until');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Recordar descarte por 3 días
    localStorage.setItem('pwa_install_dismissed_until', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <aside aria-label="Instalación de Aplicación" className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-40 bg-[#141722]/95 backdrop-blur-xl border border-[#2b3547] rounded-2xl p-3.5 shadow-fey-modal flex items-center justify-between gap-3 text-white animate-float-slow">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-spider-cobalt/15 text-spider-electric border border-spider-cobalt/30 shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white truncate">Instalar App en tu Dispositivo</h4>
          <p className="text-[11px] text-fey-graphite truncate">Acceso directo offline rápido e instantáneo</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black hover:bg-batman-gold hover:text-black font-bold text-xs transition shadow-fey-button active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-full text-fey-graphite hover:text-white transition"
          title="Descartar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
