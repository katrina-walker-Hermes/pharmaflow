import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';
import {
  auth,
  signInWithGooglePopup,
  signUpWithPharmaFlowEmail,
  signInWithPharmaFlowEmail,
  resendVerificationEmail,
  sendPharmaFlowPasswordReset,
  signOutGoogle,
  syncUserProfile,
  subscribeToWorkspace,
  saveWorkspaceToCloud,
  CloudWorkspaceSnapshot,
} from '../firebase';
import { useStore, Product, PharmacyOrder, BonDangerEntry } from '../store';
import { normalizeCategoryName } from '../utils/categoryOrder';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
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

function normalizeSnapshotForStore(snapshot: CloudWorkspaceSnapshot): {
  products: Product[];
  orders: PharmacyOrder[];
  bonDangerEntries: BonDangerEntry[];
  customCategories: string[];
  bonDangerInitialized: boolean;
} {
  const products: Product[] = Array.isArray(snapshot.products)
    ? snapshot.products.map((p) => ({
        ...p,
        category: normalizeCategoryName(p.category || 'Général'),
        transactions: Array.isArray(p.transactions) ? p.transactions : [],
      }))
    : [];

  const orders: PharmacyOrder[] = Array.isArray(snapshot.orders)
    ? snapshot.orders.map((o) => ({
        ...o,
        items: Array.isArray(o.items)
          ? o.items.map((it) => ({
              ...it,
              category: normalizeCategoryName(it.category || 'Général'),
            }))
          : [],
      }))
    : [];

  const bonDangerEntries: BonDangerEntry[] = Array.isArray(snapshot.bonDangerEntries)
    ? snapshot.bonDangerEntries
    : [];

  const customCategories: string[] = Array.isArray(snapshot.customCategories)
    ? Array.from(
        new Set(
          snapshot.customCategories
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
            .map((c) => normalizeCategoryName(c).slice(0, 100))
        )
      ).slice(0, 100)
    : [];

  return {
    products,
    orders,
    bonDangerEntries,
    customCategories,
    bonDangerInitialized: Boolean(snapshot.bonDangerInitialized),
  };
}

function computeWorkspaceSignature(snapshot: {
  products: Product[];
  orders: PharmacyOrder[];
  bonDangerEntries: BonDangerEntry[];
  customCategories?: string[];
  bonDangerInitialized?: boolean;
}): string {
  return JSON.stringify({
    products: snapshot.products || [],
    orders: snapshot.orders || [],
    bonDangerEntries: snapshot.bonDangerEntries || [],
    customCategories: snapshot.customCategories || [],
    bonDangerInitialized: Boolean(snapshot.bonDangerInitialized),
  });
}

function getCurrentStoreWorkspaceSnapshot(): CloudWorkspaceSnapshot {
  const s = useStore.getState();
  return {
    products: s.products || [],
    orders: s.orders || [],
    bonDangerEntries: s.bonDangerEntries || [],
    customCategories: s.customCategories || [],
    bonDangerInitialized: Boolean(s.bonDangerInitialized),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [allowLocalAccess, setAllowLocalAccess] = useState(false);
  const [verificationTick, setVerificationTick] = useState(0);

  const workspaceUnsubRef = useRef<Unsubscribe | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const cloudDocExistsRef = useRef<boolean | undefined>(undefined);
  const lastSyncedSignatureRef = useRef<string | null>(null);
  const hasReceivedInitialSnapshotRef = useRef(false);
  const isWritingRef = useRef(false);
  const pendingWriteRef = useRef<{ uid: string; snapshot: CloudWorkspaceSnapshot } | null>(null);

  const cleanupWorkspaceSync = useCallback(() => {
    if (workspaceUnsubRef.current) {
      workspaceUnsubRef.current();
      workspaceUnsubRef.current = null;
    }
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    cloudDocExistsRef.current = undefined;
    lastSyncedSignatureRef.current = null;
    hasReceivedInitialSnapshotRef.current = false;
    pendingWriteRef.current = null;
  }, []);

  const flushWorkspaceWrite = useCallback(
    async (uid: string, snapshot: CloudWorkspaceSnapshot) => {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid || currentUid !== uid || !auth.currentUser?.emailVerified) {
        return;
      }

      if (isWritingRef.current) {
        pendingWriteRef.current = { uid, snapshot };
        return;
      }

      isWritingRef.current = true;
      setIsSyncing(true);

      try {
        await saveWorkspaceToCloud(uid, snapshot, {
          knownExists: cloudDocExistsRef.current,
        });
        cloudDocExistsRef.current = true;
        lastSyncedSignatureRef.current = computeWorkspaceSignature(snapshot);
        setLastSyncAt(new Date().toISOString());
        setSyncError(null);
      } catch (err) {
        console.error('[PharmaFlow Sync] Échec écriture Cloud Firestore:', err);
        setSyncError(err instanceof Error ? err.message : 'Erreur de synchronisation Firestore');
      } finally {
        isWritingRef.current = false;
        const queued = pendingWriteRef.current;
        if (queued) {
          pendingWriteRef.current = null;
          void flushWorkspaceWrite(queued.uid, queued.snapshot);
        } else {
          setIsSyncing(false);
        }
      }
    },
    []
  );

  // Track Firebase Auth session changes and ensure cleanup on sign-out
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (!firebaseUser) {
        cleanupWorkspaceSync();
        setAllowLocalAccess(false);
        setIsSyncing(false);
        setSyncError(null);
      }
    });

    return () => {
      unsubscribe();
      cleanupWorkspaceSync();
    };
  }, [cleanupWorkspaceSync]);

  // Real-time Firestore onSnapshot + immediate write-through sync tied to authenticated verified user
  useEffect(() => {
    const uid = user?.uid;
    const isVerified = Boolean(user?.emailVerified);

    if (!uid || !isVerified || !user) {
      cleanupWorkspaceSync();
      return;
    }

    let cancelled = false;
    let storeUnsubscribe: (() => void) | null = null;
    setIsSyncing(true);
    setSyncError(null);

    const startRealtimeSync = async () => {
      try {
        await syncUserProfile(user);
      } catch (err) {
        if (cancelled) return;
        console.error('[PharmaFlow Sync] Erreur synchronisation profil utilisateur:', err);
        setSyncError(err instanceof Error ? err.message : 'Erreur profil Firestore');
      }

      if (cancelled || !auth.currentUser || auth.currentUser.uid !== uid) {
        return;
      }

      const activeUid = auth.currentUser.uid;

      // Subscribe to real-time updates from Firestore for this authenticated user
      const unsubSnapshot = subscribeToWorkspace(
        activeUid,
        (cloudData, meta) => {
          if (cancelled || auth.currentUser?.uid !== activeUid) return;

          // Ignore echoes from our own local pending writes once initialized
          if (meta.hasPendingWrites && hasReceivedInitialSnapshotRef.current) {
            return;
          }

          if (!cloudData) {
            cloudDocExistsRef.current = false;
            hasReceivedInitialSnapshotRef.current = true;
            const localSnapshot = getCurrentStoreWorkspaceSnapshot();
            void flushWorkspaceWrite(activeUid, localSnapshot);
            return;
          }

          cloudDocExistsRef.current = true;
          const normalized = normalizeSnapshotForStore(cloudData);
          const remoteSig = computeWorkspaceSignature(normalized);

          if (remoteSig !== lastSyncedSignatureRef.current) {
            isApplyingRemoteRef.current = true;
            try {
              useStore.setState({
                products: normalized.products,
                orders: normalized.orders,
                bonDangerEntries: normalized.bonDangerEntries,
                customCategories: normalized.customCategories,
                bonDangerInitialized: normalized.bonDangerInitialized,
              });
              lastSyncedSignatureRef.current = remoteSig;
            } finally {
              isApplyingRemoteRef.current = false;
            }
          }

          hasReceivedInitialSnapshotRef.current = true;
          setLastSyncAt(new Date().toISOString());
          setSyncError(null);
          if (!isWritingRef.current) {
            setIsSyncing(false);
          }
        },
        (error) => {
          if (cancelled) return;
          console.error('[PharmaFlow Sync] Erreur listener Firestore:', error);
          setSyncError(error instanceof Error ? error.message : 'Erreur listener Firestore');
          setIsSyncing(false);
        }
      );

      if (cancelled) {
        unsubSnapshot();
        return;
      }
      workspaceUnsubRef.current = unsubSnapshot;

      // Subscribe to local Zustand mutations and push directly to Cloud Firestore in real time
      storeUnsubscribe = useStore.subscribe((state, prevState) => {
        if (isApplyingRemoteRef.current || !hasReceivedInitialSnapshotRef.current) {
          return;
        }

        if (
          state.products === prevState.products &&
          state.orders === prevState.orders &&
          state.bonDangerEntries === prevState.bonDangerEntries &&
          state.customCategories === prevState.customCategories &&
          state.bonDangerInitialized === prevState.bonDangerInitialized
        ) {
          return;
        }

        const nextSnapshot: CloudWorkspaceSnapshot = {
          products: state.products || [],
          orders: state.orders || [],
          bonDangerEntries: state.bonDangerEntries || [],
          customCategories: state.customCategories || [],
          bonDangerInitialized: Boolean(state.bonDangerInitialized),
        };

        const sig = computeWorkspaceSignature(nextSnapshot);
        if (sig === lastSyncedSignatureRef.current) {
          return;
        }

        if (syncTimerRef.current) {
          clearTimeout(syncTimerRef.current);
        }

        // Micro-coalesce 50ms for rapid synchronous actions, then write immediately to Firestore
        syncTimerRef.current = setTimeout(() => {
          syncTimerRef.current = null;
          if (!cancelled && auth.currentUser?.uid === activeUid) {
            void flushWorkspaceWrite(activeUid, nextSnapshot);
          }
        }, 50);
      });
    };

    void startRealtimeSync();

    return () => {
      cancelled = true;
      if (storeUnsubscribe) {
        storeUnsubscribe();
      }
      cleanupWorkspaceSync();
    };
  }, [user, user?.uid, user?.emailVerified, verificationTick, cleanupWorkspaceSync, flushWorkspaceWrite]);

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
  }, []);

  const continueLocalWithoutVerification = useCallback(() => {
    setAllowLocalAccess(true);
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setAllowLocalAccess(false);
    cleanupWorkspaceSync();
    try {
      await signOutGoogle();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }, [cleanupWorkspaceSync]);

  const syncNow = useCallback(async () => {
    const activeUser = auth.currentUser || user;
    if (!activeUser || !activeUser.emailVerified) return;
    const snapshot = getCurrentStoreWorkspaceSnapshot();
    await flushWorkspaceWrite(activeUser.uid, snapshot);
  }, [user, flushWorkspaceWrite]);

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
        syncError,
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
