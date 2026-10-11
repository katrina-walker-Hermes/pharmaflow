import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Smartphone, Check } from 'lucide-react';

export default function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide
  if (isInstalled) {
    return null;
  }

  // Android / Chrome / Desktop install
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-teal-600/90 hover:bg-teal-500 text-white px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-colors"
        title="Installer l'application sur votre appareil Android ou ordinateur"
      >
        <Smartphone className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Installer l'application</span>
        <span className="sm:hidden">Installer</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg bg-teal-700/80 hover:bg-teal-600 text-teal-100 hover:text-white px-2.5 py-1.5 text-xs font-semibold border border-teal-500/40 transition-colors"
          title="Installer sur iPhone / iPad"
        >
          <Smartphone className="h-3.5 w-3.5 text-teal-300" />
          <span className="hidden sm:inline">Installer sur iPhone</span>
          <span className="sm:hidden">Installer</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 mb-safe animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Installer sur iPhone / iPad</h3>
                  <p className="text-xs text-slate-500">Ajouter à l'écran d'accueil</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white font-bold text-xs">
                    1
                  </span>
                  <p className="pt-0.5">
                    Dans Safari, appuyez sur le bouton de partage <Share2 className="inline h-4 w-4 text-teal-700 mx-1 align-sub" /> (icône carrée avec flèche en bas).
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white font-bold text-xs">
                    2
                  </span>
                  <p className="pt-0.5">
                    Faites défiler le menu et sélectionnez <strong className="text-slate-900">« Sur l'écran d'accueil »</strong> <PlusSquare className="inline h-4 w-4 text-teal-700 mx-1 align-sub" />.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white font-bold text-xs">
                    3
                  </span>
                  <p className="pt-0.5">
                    Appuyez sur <strong className="text-slate-900">Ajouter</strong> en haut à droite. L'application apparaîtra comme une app native avec icône !
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white hover:bg-teal-800 transition-colors shadow-2xs"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
