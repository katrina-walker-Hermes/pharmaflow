import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGooglePopup,
  signUpWithPharmaFlowEmail,
  signInWithPharmaFlowEmail,
  resendVerificationEmail,
  sendPharmaFlowPasswordReset,
  signOutGoogle,
  syncUserProfile,
  loadWorkspaceFromCloud,
  saveWorkspaceToCloud,
} from '../firebase';
import { useStore } from '../store';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  authError: string | null;
  authSuccess: string | null;
  allowLocalAccess: boolean;
  signInWithGmail: () => Promise<void>;
  signUpPharmaFlow: (fullName: string, email: string, password: string) => Promise<void>;
  loginPharmaFlow: (email: string, password: string) => Promise<void>;
  resetPharmaFlowPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshEmailVerification: () => Promise<boolean>;
  continueLocalWithoutVerification: () => void;
  signOutUser: () => Promise<void>;
  syncNow: () => Promise<void>;
  clearAuthMessages: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return "L'authentification par e-mail/mot de passe n'est pas encore activée dans votre projet Firebase. Activez le fournisseur « Adresse e-mail/Mot de passe » dans Firebase Console → Authentication → Sign-in method.";
    case 'auth/email-already-in-use':
      return 'Un compte PharmaFlow existe déjà avec cette adresse e-mail. Utilisez le bouton « Login » pour vous connecter.';
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide. Vérifiez le format (ex: nom@gmail.com).';
    case 'auth/weak-password':
      return 'Mot de passe trop faible. Choisissez au moins 6 caractères.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou mot de passe incorrect. Vérifiez vos identifiants ou créez un compte PharmaFlow.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Fenêtre Google fermée. Vous pouvez utiliser la connexion PharmaFlow (E-mail / Mot de passe) ci-dessous.';
    case 'auth/popup-blocked':
      return 'Pop-up Google bloqué par le navigateur. Utilisez la connexion PharmaFlow par e-mail/mot de passe.';
    case 'auth/network-request-failed':
      return 'Erreur réseau. Vérifiez votre connexion Internet puis réessayez.';
    default:
      return "Impossible d'effectuer cette opération d'authentification. Veuillez réessayer.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [allowLocalAccess, setAllowLocalAccess] = useState(false);
  const [, setVerificationTick] = useState(0);

  const hasHydratedCloudForUid = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydrateCloudForVerifiedUser = useCallback(async (firebaseUser: User) => {
    if (!firebaseUser.emailVerified || hasHydratedCloudForUid.current === firebaseUser.uid) {
      return;
    }
    hasHydratedCloudForUid.current = firebaseUser.uid;
    try {
      setIsSyncing(true);
      await syncUserProfile(firebaseUser);
      const cloudData = await loadWorkspaceFromCloud(firebaseUser.uid);
      const localState = useStore.getState();

      if (cloudData) {
        const localIsEmpty =
          localState.products.length === 0 &&
          localState.orders.length === 0 &&
          localState.bonDangerEntries.length === 0;

        if (
          localIsEmpty &&
          (cloudData.products.length > 0 ||
            cloudData.orders.length > 0 ||
            cloudData.bonDangerEntries.length > 0)
        ) {
          localState.importAllData(
            {
              products: cloudData.products,
              orders: cloudData.orders,
              bonDangerEntries: cloudData.bonDangerEntries,
              bonDangerDocuments: localState.bonDangerDocuments,
            },
            'replace'
          );
        }
        setLastSyncAt(new Date().toISOString());
      } else if (
        localState.products.length > 0 ||
        localState.orders.length > 0 ||
        localState.bonDangerEntries.length > 0
      ) {
        await saveWorkspaceToCloud(firebaseUser.uid, {
          products: localState.products,
          orders: localState.orders,
          bonDangerEntries: localState.bonDangerEntries,
          bonDangerInitialized: localState.bonDangerInitialized,
        });
        setLastSyncAt(new Date().toISOString());
      }
    } catch (err) {
      console.error('Erreur synchronisation initiale Firebase:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser && firebaseUser.emailVerified) {
        await hydrateCloudForVerifiedUser(firebaseUser);
      }

      if (!firebaseUser) {
        hasHydratedCloudForUid.current = null;
        setAllowLocalAccess(false);
      }
    });

    return () => unsubscribe();
  }, [hydrateCloudForVerifiedUser]);

  // Debounced background cloud sync when local store changes for verified authenticated users
  useEffect(() => {
    if (!user || !user.emailVerified) return;

    const unsubscribeStore = useStore.subscribe((state, prevState) => {
      if (
        state.products === prevState.products &&
        state.orders === prevState.orders &&
        state.bonDangerEntries === prevState.bonDangerEntries
      ) {
        return;
      }

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }

      syncTimerRef.current = setTimeout(async () => {
        try {
          setIsSyncing(true);
          await saveWorkspaceToCloud(user.uid, {
            products: state.products,
            orders: state.orders,
            bonDangerEntries: state.bonDangerEntries,
            bonDangerInitialized: state.bonDangerInitialized,
          });
          setLastSyncAt(new Date().toISOString());
        } catch (err) {
          console.error('Erreur synchronisation automatique:', err);
        } finally {
          setIsSyncing(false);
        }
      }, 5000);
    });

    return () => {
      unsubscribeStore();
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [user]);

  const signInWithGmail = useCallback(async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsSigningIn(true);
    try {
      await signInWithGooglePopup();
    } catch (error: unknown) {
      setAuthError(mapFirebaseAuthError(error));
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signUpPharmaFlow = useCallback(async (fullName: string, email: string, password: string) => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsSigningIn(true);
    try {
      await signUpWithPharmaFlowEmail(fullName, email, password);
      setAuthSuccess(
        `Compte PharmaFlow créé ! Un lien de vérification a été envoyé à ${email.trim()}.`
      );
    } catch (error: unknown) {
      setAuthError(mapFirebaseAuthError(error));
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const loginPharmaFlow = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsSigningIn(true);
    try {
      await signInWithPharmaFlowEmail(email, password);
    } catch (error: unknown) {
      setAuthError(mapFirebaseAuthError(error));
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const resetPharmaFlowPassword = useCallback(async (email: string) => {
    setAuthError(null);
    setAuthSuccess(null);
    if (!email.trim()) {
      setAuthError('Saisissez votre adresse e-mail pour recevoir le lien de réinitialisation.');
      return;
    }
    setIsSigningIn(true);
    try {
      await sendPharmaFlowPasswordReset(email);
      setAuthSuccess(`Un e-mail de réinitialisation du mot de passe a été envoyé à ${email.trim()}.`);
    } catch (error: unknown) {
      setAuthError(mapFirebaseAuthError(error));
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const resendVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    setAuthError(null);
    setAuthSuccess(null);
    setIsSigningIn(true);
    try {
      await resendVerificationEmail(auth.currentUser);
      setAuthSuccess(`E-mail de vérification renvoyé à ${auth.currentUser.email}.`);
    } catch (error: unknown) {
      setAuthError(mapFirebaseAuthError(error));
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const refreshEmailVerification = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      const updatedUser = auth.currentUser;
      setUser(updatedUser);
      setVerificationTick((v) => v + 1);
      if (updatedUser.emailVerified) {
        setAuthSuccess('E-mail vérifié avec succès !');
        await hydrateCloudForVerifiedUser(updatedUser);
        return true;
      }
      setAuthError("Votre e-mail n'est pas encore marqué comme vérifié. Cliquez sur le lien reçu dans votre boîte mail puis réessayez.");
      return false;
    } catch (error: unknown) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [hydrateCloudForVerifiedUser]);

  const continueLocalWithoutVerification = useCallback(() => {
    setAllowLocalAccess(true);
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setAllowLocalAccess(false);
    try {
      await signOutGoogle();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!user || !user.emailVerified) return;
    setIsSyncing(true);
    try {
      const state = useStore.getState();
      await saveWorkspaceToCloud(user.uid, {
        products: state.products,
        orders: state.orders,
        bonDangerEntries: state.bonDangerEntries,
        bonDangerInitialized: state.bonDangerInitialized,
      });
      setLastSyncAt(new Date().toISOString());
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  const clearAuthMessages = useCallback(() => {
    setAuthError(null);
    setAuthSuccess(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isSigningIn,
        isSyncing,
        lastSyncAt,
        authError,
        authSuccess,
        allowLocalAccess,
        signInWithGmail,
        signUpPharmaFlow,
        loginPharmaFlow,
        resetPharmaFlowPassword,
        resendVerification,
        refreshEmailVerification,
        continueLocalWithoutVerification,
        signOutUser,
        syncNow,
        clearAuthMessages,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
