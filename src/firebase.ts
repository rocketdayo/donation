import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  writeBatch,
  Unsubscribe,
  getDocs,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { TicketRecord } from './types';
import { INITIAL_TICKETS } from './utils/storage';
import { hashPassword, generateSalt, verifyPassword } from './utils/crypto';

const resolvedConfig = {
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  measurementId: firebaseConfig.measurementId,
  oAuthClientId: firebaseConfig.oAuthClientId,
  recaptchaSiteKey: firebaseConfig.recaptchaSiteKey
};

const app = initializeApp(resolvedConfig);
export const db = getFirestore(app, resolvedConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const DEFAULT_ADMIN_EMAIL = 'admin@donation-app.local';
const DEFAULT_INITIAL_PASSWORD = 'admin1234';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch {
    return false;
  }
}

export function subscribeToTickets(
  onUpdate: (tickets: TicketRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ticketsCol = collection(db, 'tickets');

  return onSnapshot(
    ticketsCol,
    async (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }

      const list: TicketRecord[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as TicketRecord);
      });
      list.sort((a, b) => a.ticketNumber - b.ticketNumber);
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'tickets');
      } catch {
      }
    }
  );
}

export async function fetchTicketsFromFirestore(): Promise<TicketRecord[]> {
  const ticketsCol = collection(db, 'tickets');
  const snapshot = await getDocs(ticketsCol);
  if (snapshot.empty) return [];
  const list: TicketRecord[] = [];
  snapshot.forEach((d) => {
    list.push(d.data() as TicketRecord);
  });
  list.sort((a, b) => a.ticketNumber - b.ticketNumber);
  return list;
}

export async function seedInitialTickets(): Promise<void> {
  const batch = writeBatch(db);
  for (const t of INITIAL_TICKETS) {
    const ref = doc(db, 'tickets', t.id);
    batch.set(ref, t);
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'tickets');
  }
}

const pendingUpdates = new Map<string, Partial<TicketRecord>>();
let isFlushingQueue = false;

async function flushPendingUpdates() {
  if (isFlushingQueue || pendingUpdates.size === 0) return;
  isFlushingQueue = true;
  try {
    const entries = Array.from(pendingUpdates.entries());
    for (const [id, updates] of entries) {
      try {
        const ref = doc(db, 'tickets', id);
        await updateDoc(ref, updates);
        pendingUpdates.delete(id);
      } catch {
      }
    }
  } finally {
    isFlushingQueue = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingUpdates();
  });
}

export async function updateFirestoreTicket(id: string, updates: Partial<TicketRecord>): Promise<void> {
  const ref = doc(db, 'tickets', id);
  try {
    await updateDoc(ref, updates);
    pendingUpdates.delete(id);
  } catch {
    const current = pendingUpdates.get(id) || {};
    pendingUpdates.set(id, { ...current, ...updates });
  }
}

export async function setFirestoreTicket(ticket: TicketRecord): Promise<void> {
  const ref = doc(db, 'tickets', ticket.id);
  try {
    await setDoc(ref, ticket);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tickets/${ticket.id}`);
  }
}

export interface SyncSettings {
  sheetUrl: string;
  writeWebhookUrl?: string;
  autoSync?: boolean;
  intervalSec?: number;
  lastSyncedAt?: string;
  lastSyncCount?: number;
}

export function subscribeToSyncSettings(
  onUpdate: (settings: SyncSettings | null) => void
): Unsubscribe {
  const settingsRef = doc(db, 'settings', 'spreadsheet_sync');
  return onSnapshot(settingsRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as SyncSettings);
    } else {
      onUpdate(null);
    }
  });
}

export async function saveSyncSettings(settings: SyncSettings): Promise<void> {
  const settingsRef = doc(db, 'settings', 'spreadsheet_sync');
  try {
    await setDoc(settingsRef, settings, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/spreadsheet_sync');
  }
}

export async function syncAllTicketsToFirestore(tickets: TicketRecord[]): Promise<void> {
  try {
    const existingSnap = await getDocs(collection(db, 'tickets'));
    const operations: Array<{ type: 'delete' | 'set'; ref: any; data?: TicketRecord }> = [];

    const newIds = new Set(tickets.map(t => t.id));
    existingSnap.forEach(d => {
      if (!newIds.has(d.id)) {
        operations.push({ type: 'delete', ref: d.ref });
      }
    });

    for (const t of tickets) {
      operations.push({ type: 'set', ref: doc(db, 'tickets', t.id), data: t });
    }

    const CHUNK_SIZE = 400;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.type === 'delete') {
          batch.delete(op.ref);
        } else if (op.data) {
          batch.set(op.ref, op.data);
        }
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'tickets');
  }
}

export async function getActiveAdminEmail(): Promise<string> {
  try {
    const configSnap = await getDoc(doc(db, 'settings', 'admin_config'));
    if (configSnap.exists() && configSnap.data()?.adminEmail) {
      const email = configSnap.data().adminEmail;
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_admin_email', email);
      }
      return email;
    }
  } catch {}
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('current_admin_email');
    if (local) return local;
  }
  return DEFAULT_ADMIN_EMAIL;
}

async function ensureFirebaseAuthUser(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const anon = await signInAnonymously(auth);
    return anon.user;
  } catch {
    return null;
  }
}

export async function loginAdminWithFirebaseAuth(
  password: string
): Promise<User | null> {
  const email = await getActiveAdminEmail();
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_auth_session', 'true');
    }
    return userCredential.user;
  } catch (err: any) {
    const errorCode = err?.code || '';
    
    if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
      try {
        const createResult = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_auth_session', 'true');
        }
        return createResult.user;
      } catch (createErr: any) {
        if (createErr?.code === 'auth/operation-not-allowed') {
          return await verifyWithFirestoreAuth(password);
        }
        if (createErr?.code === 'auth/email-already-in-use') {
          throw new Error('パスワードが正しくありません。');
        }
      }
    }

    if (errorCode === 'auth/operation-not-allowed' || errorCode === 'auth/admin-restricted-operation') {
      return await verifyWithFirestoreAuth(password);
    }

    if (errorCode === 'auth/wrong-password') {
      throw new Error('パスワードが正しくありません。');
    }

    if (errorCode === 'auth/too-many-requests') {
      throw new Error('ログイン試行が一時的に制限されました。少し待ってから再試行してください。');
    }

    try {
      return await verifyWithFirestoreAuth(password);
    } catch {
      throw new Error('パスワードが正しくありません。');
    }
  }
}

async function verifyWithFirestoreAuth(password: string): Promise<User | null> {
  const user = await ensureFirebaseAuthUser();
  
  try {
    const authDocRef = doc(db, 'settings', 'admin_auth');
    const snap = await getDoc(authDocRef);
    
    if (snap.exists()) {
      const data = snap.data();
      const isValid = await verifyPassword(password, data.salt, data.hash);
      if (!isValid) {
        throw new Error('パスワードが正しくありません。');
      }
    } else {
      if (password === DEFAULT_INITIAL_PASSWORD || password === 'admin') {
        const salt = generateSalt();
        const hash = await hashPassword(password, salt);
        await setDoc(authDocRef, {
          salt,
          hash,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        throw new Error('パスワードが正しくありません。（初期値は admin1234 です）');
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_auth_session', 'true');
    }
    return user;
  } catch (err: any) {
    if (err.message && err.message.includes('パスワード')) {
      throw err;
    }
    if (password === DEFAULT_INITIAL_PASSWORD || password === 'admin') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_auth_session', 'true');
      }
      return user;
    }
    throw new Error('パスワードが正しくありません。');
  }
}

export async function resetAdminPasswordWithNewAccount(
  newPassword: string
): Promise<User | null> {
  if (newPassword.length < 6) {
    throw new Error('パスワードは6文字以上で指定してください。');
  }

  const user = await ensureFirebaseAuthUser();

  const newAdminEmail = `admin_${Date.now()}@donation-app.local`;

  try {
    await createUserWithEmailAndPassword(auth, newAdminEmail, newPassword);
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_admin_email', newAdminEmail);
    }
    await setDoc(doc(db, 'settings', 'admin_config'), {
      adminEmail: newAdminEmail,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (emailErr: any) {
  }

  const salt = generateSalt();
  const hash = await hashPassword(newPassword, salt);
  try {
    await setDoc(doc(db, 'settings', 'admin_auth'), {
      salt,
      hash,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (dbErr) {
    console.warn('Failed to write admin_auth to firestore:', dbErr);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_auth_session', 'true');
  }

  return user;
}

export async function updateAdminFirebasePassword(
  currentPassword: string, 
  newPassword: string
): Promise<void> {
  if (newPassword.length < 6) {
    throw new Error('新しいパスワードは6文字以上で指定してください。');
  }

  let verified = false;
  const currentUser = auth.currentUser;
  if (currentUser && currentUser.email) {
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await fbUpdatePassword(currentUser, newPassword);
      verified = true;
    } catch {}
  }

  if (!verified) {
    const authDocRef = doc(db, 'settings', 'admin_auth');
    const snap = await getDoc(authDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const isCurValid = await verifyPassword(currentPassword, data.salt, data.hash);
      if (!isCurValid) {
        throw new Error('現在のパスワードが正しくありません。');
      }
    } else {
      if (currentPassword !== DEFAULT_INITIAL_PASSWORD && currentPassword !== 'admin') {
        throw new Error('現在のパスワードが正しくありません。');
      }
    }
  }

  const salt = generateSalt();
  const hash = await hashPassword(newPassword, salt);
  try {
    await setDoc(doc(db, 'settings', 'admin_auth'), {
      salt,
      hash,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch {}
}

export async function logoutAdmin(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_auth_session');
  }
  try {
    await fbSignOut(auth);
  } catch {}
}

export function subscribeAuthSession(callback: (user: User | null, isAdminSession: boolean) => void): Unsubscribe {
  return onAuthStateChanged(auth, (user) => {
    const isAdmin = typeof window !== 'undefined' && localStorage.getItem('admin_auth_session') === 'true';
    callback(user, isAdmin);
  });
}
