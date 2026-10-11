import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl border border-amber-500 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-700/80">
        <WifiOff className="h-3.5 w-3.5 text-amber-100" />
      </div>
      <div>
        <p className="leading-tight font-bold">Mode Hors-ligne actif</p>
        <p className="text-[11px] text-amber-100 font-normal">
          Toutes vos saisies d'inventaire et mouvements sont sauvegardés en local sur votre appareil.
        </p>
      </div>
    </div>
  );
};
