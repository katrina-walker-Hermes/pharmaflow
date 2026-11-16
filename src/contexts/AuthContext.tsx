import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGooglePopup,
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
  signInWithGmail: () => Promise<void>;
  signOutUser: () => Promise<void>;
  syncNow: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const hasHydratedCloudForUid = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser && firebaseUser.emailVerified && hasHydratedCloudForUid.current !== firebaseUser.uid) {
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

            if (localIsEmpty && (cloudData.products.length > 0 || cloudData.orders.length > 0 || cloudData.bonDangerEntries.length > 0)) {
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
      }

      if (!firebaseUser) {
        hasHydratedCloudForUid.current = null;
      }
    });

    return () => unsubscribe();
  }, []);

  // Debounced background cloud sync when local store changes for authenticated Gmail users
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
    setIsSigningIn(true);
    try {
      const result = await signInWithGooglePopup();
      if (result.user && !result.user.emailVerified) {
        setAuthError("Votre adresse Gmail n'est pas vérifiée par Google.");
        await signOutGoogle();
      }
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Connexion annulée. Cliquez à nouveau sur le bouton pour vous connecter avec Gmail.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError("La fenêtre de connexion Google a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up pour ce site.");
      } else if (code === 'auth/network-request-failed') {
        setAuthError('Erreur réseau. Vérifiez votre connexion Internet puis réessayez.');
      } else {
        setAuthError('Impossible de finaliser la connexion Gmail. Veuillez réessayer.');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
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

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isSigningIn,
        isSyncing,
        lastSyncAt,
        authError,
        signInWithGmail,
        signOutUser,
        syncNow,
        clearAuthError,
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
