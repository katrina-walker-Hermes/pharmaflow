import { useState } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  FileText,
  ClipboardList,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export default function GmailLoginScreen() {
  const {
    user,
    signInWithGmail,
    signUpPharmaFlow,
    loginPharmaFlow,
    resetPharmaFlowPassword,
    resendVerification,
    refreshEmailVerification,
    continueLocalWithoutVerification,
    signOutUser,
    isSigningIn,
    authError,
    authSuccess,
    clearAuthMessages,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setLocalError(null);
    clearAuthMessages();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError('Veuillez saisir votre e-mail et votre mot de passe.');
      return;
    }
    await loginPharmaFlow(email, password);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!fullName.trim()) {
      setLocalError('Veuillez indiquer votre nom complet.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Veuillez saisir votre adresse e-mail.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }
    await signUpPharmaFlow(fullName, email, password);
  };

  const displayError = localError || authError;

  // Verification view when user signed up with email/password and hasn't verified yet
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
          <div className="bg-teal-900 px-6 py-6 text-white text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700/80 border border-teal-500/40 text-teal-200">
              <Mail className="h-6 w-6" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
              Compte PharmaFlow — CHP Sidi Ifni
            </p>
            <h1 className="mt-1 text-lg font-black text-white">
              Vérifiez votre adresse e-mail
            </h1>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              Un lien de validation a été envoyé à <strong className="text-slate-900">{user.email}</strong>.
              Ouvrez votre boîte mail (ou dossier spam) puis cliquez sur le lien pour activer la sauvegarde Cloud.
            </p>

            {displayError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{authSuccess}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isSigningIn}
              onClick={() => refreshEmailVerification()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-3 text-xs font-bold shadow-xs transition-all disabled:opacity-60"
            >
              {isSigningIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>J'ai vérifié mon e-mail — Continuer</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => resendVerification()}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Renvoyer le lien
              </button>
              <button
                type="button"
                onClick={() => continueLocalWithoutVerification()}
                className="rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 px-3 py-2 text-xs font-semibold text-teal-800"
              >
                Accès immédiat (local)
              </button>
            </div>

            <button
              type="button"
              onClick={() => signOutUser()}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-rose-600 pt-1"
            >
              Changer de compte / Retour au Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Hospital Official Top Header */}
        <div className="bg-teal-900 px-6 py-6 text-white text-center relative overflow-hidden">
          <div className="mx-auto mb-2.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700/80 border border-teal-500/40 text-teal-200 shadow-inner">
            <Stethoscope className="h-6 w-6" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
            Ministère de la Santé — CHP Sidi Ifni
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white">
            PharmaFlow • Bloc Opératoire
          </h1>
          <p className="mt-0.5 text-xs text-teal-200">
            Fiches de Stock, Bons de Commande & Stupéfiants
          </p>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Two Clear Primary Action Buttons: Login & Création de compte PharmaFlow */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={clsx(
                'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-all',
                mode === 'login'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
            >
              <LogIn className="h-3.5 w-3.5 shrink-0" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={clsx(
                'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-all',
                mode === 'signup'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span>Créer compte PharmaFlow</span>
            </button>
          </div>

          {displayError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{displayError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{authSuccess}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse e-mail / Gmail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="exemple@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Mot de passe</label>
                  <button
                    type="button"
                    onClick={() => resetPharmaFlowPassword(email)}
                    className="text-[11px] font-semibold text-teal-700 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-3 text-sm font-bold shadow-xs transition-all active:scale-[0.99] disabled:opacity-60"
              >
                {isSigningIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                <span>{isSigningIn ? 'Connexion...' : 'Se connecter (Login)'}</span>
              </button>
            </form>
          ) : (
            /* SIGNUP FORM (Création de compte PharmaFlow) */
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom complet / Fonction
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Major Bloc Opératoire"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse e-mail / Gmail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="exemple@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mot de passe (min. 6)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirmer
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 text-sm font-bold shadow-xs transition-all active:scale-[0.99] disabled:opacity-60"
              >
                {isSigningIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span>{isSigningIn ? 'Création du compte...' : 'Créer un compte PharmaFlow'}</span>
              </button>
            </form>
          )}

          {/* Divider + Optional Google Sign-In */}
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">ou</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <button
            type="button"
            disabled={isSigningIn}
            onClick={signInWithGmail}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.99] disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            <span>Continuer avec Gmail (Pop-up Google)</span>
          </button>

          {/* Compact Clinical Modules Summary */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2">
              <FileText className="h-4 w-4 text-teal-700 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-slate-700">Fiches Stock</span>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2">
              <ClipboardList className="h-4 w-4 text-teal-700 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-slate-700">Commandes PDF</span>
            </div>
            <div className="rounded-xl bg-rose-50/70 border border-rose-200/70 p-2">
              <ShieldAlert className="h-4 w-4 text-rose-600 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-rose-800">Le Bon Danger</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Authentification sécurisée Firebase PharmaFlow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
