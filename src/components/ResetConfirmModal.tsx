import { useState } from 'react';
import { useStore } from '../store';
import { AlertTriangle, RotateCcw, X, Check } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResetConfirmModal({ isOpen, onClose }: ResetConfirmModalProps) {
  const resetAllStocksToBlank = useStore((state) => state.resetAllStocksToBlank);
  const productsCount = useStore((state) => state.products.length);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    resetAllStocksToBlank();
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1"
        >
          <X className="h-5 w-5" />
        </button>

        {confirmed ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Stocks réinitialisés à blanc !</h3>
            <p className="text-sm text-slate-600">
              Tous les effectifs sont maintenant à 0. Vous pouvez commencer la saisie de votre inventaire.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="rounded-full bg-amber-100 p-2.5">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Remise à zéro des stocks</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Cette action va effacer l'historique des entrées/sorties pour l'ensemble des{' '}
              <strong className="text-slate-800">{productsCount} produits</strong>.
            </p>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">✓ Les fiches produits et catégories sont conservées.</p>
              <p>✓ Tous les stocks reviendront à 0 (vierges) pour votre saisie d'inventaire initial.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition-all active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                Confirmer la remise à blanc
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
