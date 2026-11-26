import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  getDocFromServer,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { Product, PharmacyOrder, BonDangerEntry } from './store';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

function stripUndefined<T>(value: T): T {
  if (typeof value === 'number') {
    return (Number.isFinite(value) ? value : 0) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        clean[k] = stripUndefined(v);
      }
    });
    return clean as T;
  }
  return value;
}

export async function signInWithGooglePopup() {
  return signInWithPopup(auth, googleProvider);
}

export async function signUpWithPharmaFlowEmail(
  fullName: string,
  email: string,
  password: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const cleanName = fullName.trim().slice(0, 120);
  if (cleanName) {
    await updateProfile(cred.user, { displayName: cleanName });
  }
  await sendEmailVerification(cred.user);
  return cred;
}

export async function signInWithPharmaFlowEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function resendVerificationEmail(user: User) {
  return sendEmailVerification(user);
}

export async function sendPharmaFlowPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function signOutGoogle() {
  return signOut(auth);
}

export async function syncUserProfile(user: User): Promise<void> {
  if (!user.uid || !user.emailVerified || !user.email) return;

  const publicPath = `users/${user.uid}`;
  const privatePath = `users/${user.uid}/private/info`;
  const publicRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');

  const safeDisplayName = (
    user.displayName?.trim() ||
    user.email.split('@')[0] ||
    'Utilisateur Bloc'
  ).slice(0, 120);

  const safePhotoUrl = user.photoURL ? user.photoURL.slice(0, 500) : undefined;
  const safeEmail = user.email.slice(0, 254);

  let publicSnap;
  try {
    publicSnap = await getDoc(publicRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, publicPath);
  }

  let privateSnap;
  try {
    privateSnap = await getDoc(privateRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privatePath);
  }

  if (!publicSnap.exists() && !privateSnap.exists()) {
    const batch = writeBatch(db);
    const publicPayload: Record<string, unknown> = {
      uid: user.uid,
      displayName: safeDisplayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (safePhotoUrl) {
      publicPayload.photoURL = safePhotoUrl;
    }

    batch.set(publicRef, publicPayload);
    batch.set(privateRef, {
      uid: user.uid,
      email: safeEmail,
      emailVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, publicPath);
    }
    return;
  }

  if (!publicSnap.exists()) {
    const publicPayload: Record<string, unknown> = {
      uid: user.uid,
      displayName: safeDisplayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (safePhotoUrl) {
      publicPayload.photoURL = safePhotoUrl;
    }
    try {
      await setDoc(publicRef, publicPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, publicPath);
    }
  } else {
    const publicUpdate: Record<string, unknown> = {
      displayName: safeDisplayName,
      updatedAt: serverTimestamp(),
    };
    if (safePhotoUrl) {
      publicUpdate.photoURL = safePhotoUrl;
    }
    try {
      await updateDoc(publicRef, publicUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, publicPath);
    }
  }

  if (!privateSnap.exists()) {
    try {
      await setDoc(privateRef, {
        uid: user.uid,
        email: safeEmail,
        emailVerified: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, privatePath);
    }
  } else {
    try {
      await updateDoc(privateRef, {
        email: safeEmail,
        emailVerified: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, privatePath);
    }
  }
}

export interface CloudWorkspaceSnapshot {
  products: Product[];
  orders: PharmacyOrder[];
  bonDangerEntries: BonDangerEntry[];
  customCategories?: string[];
  bonDangerInitialized?: boolean;
}

export interface WorkspaceSnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export function subscribeToWorkspace(
  uid: string,
  onUpdate: (snapshot: CloudWorkspaceSnapshot | null, meta: WorkspaceSnapshotMeta) => void,
  onError: (error: unknown) => void
): Unsubscribe {
  const activeUid = auth.currentUser?.uid || uid;
  const path = `users/${activeUid}/workspaces/default`;
  const ref = doc(db, 'users', activeUid, 'workspaces', 'default');

  return onSnapshot(
    ref,
    (snap) => {
      const meta: WorkspaceSnapshotMeta = {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      };

      if (!snap.exists()) {
        onUpdate(null, meta);
        return;
      }

      const data = snap.data();
      onUpdate(
        {
          products: Array.isArray(data.products) ? (data.products as Product[]) : [],
          orders: Array.isArray(data.orders) ? (data.orders as PharmacyOrder[]) : [],
          bonDangerEntries: Array.isArray(data.bonDangerEntries)
            ? (data.bonDangerEntries as BonDangerEntry[])
            : [],
          customCategories: Array.isArray(data.customCategories)
            ? data.customCategories
                .filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
                .map((c: string) => c.trim().slice(0, 100))
            : [],
          bonDangerInitialized:
            typeof data.bonDangerInitialized === 'boolean' ? data.bonDangerInitialized : undefined,
        },
        meta
      );
    },
    (error) => {
      console.error(`[PharmaFlow Sync] Erreur listener onSnapshot sur ${path}:`, error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (formattedError) {
        onError(formattedError);
      }
    }
  );
}

export async function saveWorkspaceToCloud(
  uid: string,
  snapshot: CloudWorkspaceSnapshot,
  options?: { knownExists?: boolean }
): Promise<void> {
  const activeUid = auth.currentUser?.uid || uid;
  const path = `users/${activeUid}/workspaces/default`;
  const ref = doc(db, 'users', activeUid, 'workspaces', 'default');

  const safeProducts = stripUndefined(snapshot.products || []).slice(0, 500);
  const safeOrders = stripUndefined(snapshot.orders || []).slice(0, 300);
  const safeBonDanger = stripUndefined(snapshot.bonDangerEntries || []).slice(0, 500);
  const safeCustomCategories = Array.from(
    new Set(
      (snapshot.customCategories || [])
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => c.trim().slice(0, 100))
    )
  ).slice(0, 100);

  const createDocument = async () => {
    try {
      await setDoc(ref, {
        uid: activeUid,
        hospital: 'CHP Sidi Ifni',
        serviceName: 'Service du Bloc Opératoire',
        products: safeProducts,
        orders: safeOrders,
        bonDangerEntries: safeBonDanger,
        customCategories: safeCustomCategories,
        bonDangerInitialized: Boolean(snapshot.bonDangerInitialized),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`[PharmaFlow Sync] Erreur création Firestore sur ${path}:`, error);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateDocument = async () => {
    try {
      await updateDoc(ref, {
        hospital: 'CHP Sidi Ifni',
        serviceName: 'Service du Bloc Opératoire',
        products: safeProducts,
        orders: safeOrders,
        bonDangerEntries: safeBonDanger,
        customCategories: safeCustomCategories,
        bonDangerInitialized: Boolean(snapshot.bonDangerInitialized),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'not-found') {
        await createDocument();
        return;
      }
      console.error(`[PharmaFlow Sync] Erreur mise à jour Firestore sur ${path}:`, error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  if (options?.knownExists === true) {
    await updateDocument();
    return;
  }

  if (options?.knownExists === false) {
    await createDocument();
    return;
  }

  // Fallback when existence is not yet known (e.g. manual sync before snapshot)
  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    console.error(`[PharmaFlow Sync] Erreur lecture Firestore sur ${path}:`, error);
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!existingSnap.exists()) {
    await createDocument();
  } else {
    await updateDocument();
  }
}
