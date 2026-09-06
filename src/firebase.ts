import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { TicketRecord } from './types';
import { INITIAL_TICKETS } from './utils/storage';

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

export async function loginAdminWithFirebaseAuth(
  password: string, 
  email: string = DEFAULT_ADMIN_EMAIL
): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return userCredential.user;
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
      try {
        const createResult = await createUserWithEmailAndPassword(auth, email.trim(), password);
        return createResult.user;
      } catch (createErr: any) {
        if (createErr?.code === 'auth/email-already-in-use') {
          throw new Error('パスワードが正しくありません。');
        }
        throw new Error('管理者アカウント認証に失敗しました。パスワードをご確認ください。');
      }
    }
    if (err?.code === 'auth/wrong-password') {
      throw new Error('パスワードが正しくありません。');
    }
    if (err?.code === 'auth/too-many-requests') {
      throw new Error('ログイン試行が制限されました。しばらく時間をおいて再試行してください。');
    }
    throw new Error('認証に失敗しました。パスワードまたはネットワークをご確認ください。');
  }
}

export async function updateAdminFirebasePassword(
  currentPassword: string, 
  newPassword: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('ログイン状態が見つかりません。再ログインしてください。');
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await fbUpdatePassword(currentUser, newPassword);
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch {}
}

export function subscribeAuthSession(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}
