import { Stethoscope, ShieldCheck, FileText, ClipboardList, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function GmailLoginScreen() {
  const { signInWithGmail, isSigningIn, authError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Hospital Official Top Header */}
        <div className="bg-teal-900 px-6 py-7 text-white text-center relative overflow-hidden">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700/80 border border-teal-500/40 text-teal-200 shadow-inner">
            <Stethoscope className="h-7 w-7" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
            Ministère de la Santé — CHP Sidi Ifni
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white">
            Pharmacie du Bloc Opératoire
          </h1>
          <p className="mt-1 text-xs text-teal-200">
            Gestion des Fiches de Stock, Commandes & Stupéfiants
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-base font-bold text-slate-900">
              Connexion sécurisée requise
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connectez-vous avec votre compte <strong>Gmail / Google</strong> pour accéder aux fiches de stock et sauvegarder vos données dans votre espace sécurisé.
            </p>
          </div>

          {authError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{authError}</span>
            </div>
          )}

          {/* Google / Gmail Sign-In Button */}
          <button
            type="button"
            disabled={isSigningIn}
            onClick={signInWithGmail}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 shadow-xs hover:bg-slate-50 hover:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {isSigningIn ? (
              <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
            ) : (
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>{isSigningIn ? 'Connexion en cours...' : 'Se connecter avec Gmail'}</span>
          </button>

          {/* Compact Clinical Modules Summary */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2.5">
              <FileText className="h-4 w-4 text-teal-700 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-slate-700">Fiches Stock</span>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2.5">
              <ClipboardList className="h-4 w-4 text-teal-700 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-slate-700">Commandes PDF</span>
            </div>
            <div className="rounded-xl bg-rose-50/70 border border-rose-200/70 p-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-600 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-rose-800">Le Bon Danger</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Authentification Google Firebase sécurisée</span>
          </div>
        </div>
      </div>
    </div>
  );
}
