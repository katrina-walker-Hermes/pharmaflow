import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
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
  bonDangerInitialized?: boolean;
}

export async function loadWorkspaceFromCloud(
  uid: string
): Promise<CloudWorkspaceSnapshot | null> {
  const path = `users/${uid}/workspaces/default`;
  const ref = doc(db, 'users', uid, 'workspaces', 'default');

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      products: Array.isArray(data.products) ? (data.products as Product[]) : [],
      orders: Array.isArray(data.orders) ? (data.orders as PharmacyOrder[]) : [],
      bonDangerEntries: Array.isArray(data.bonDangerEntries)
        ? (data.bonDangerEntries as BonDangerEntry[])
        : [],
      bonDangerInitialized:
        typeof data.bonDangerInitialized === 'boolean' ? data.bonDangerInitialized : undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveWorkspaceToCloud(
  uid: string,
  snapshot: CloudWorkspaceSnapshot
): Promise<void> {
  const path = `users/${uid}/workspaces/default`;
  const ref = doc(db, 'users', uid, 'workspaces', 'default');

  const safeProducts = stripUndefined(snapshot.products || []).slice(0, 500);
  const safeOrders = stripUndefined(snapshot.orders || []).slice(0, 300);
  const safeBonDanger = stripUndefined(snapshot.bonDangerEntries || []).slice(0, 500);

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!existingSnap.exists()) {
    try {
      await setDoc(ref, {
        uid,
        hospital: 'CHP Sidi Ifni',
        serviceName: 'Service du Bloc Opératoire',
        products: safeProducts,
        orders: safeOrders,
        bonDangerEntries: safeBonDanger,
        bonDangerInitialized: Boolean(snapshot.bonDangerInitialized),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(ref, {
        hospital: 'CHP Sidi Ifni',
        serviceName: 'Service du Bloc Opératoire',
        products: safeProducts,
        orders: safeOrders,
        bonDangerEntries: safeBonDanger,
        bonDangerInitialized: Boolean(snapshot.bonDangerInitialized),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}
