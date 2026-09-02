import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  Unsubscribe,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { TicketRecord } from './types';
import { INITIAL_TICKETS } from './utils/storage';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection confirmed.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
    }
    return false;
  }
}

// Subscribe to real-time tickets from Firestore
export function subscribeToTickets(
  onUpdate: (tickets: TicketRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ticketsCol = collection(db, 'tickets');

  return onSnapshot(
    ticketsCol,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial tickets if database collection is empty
        try {
          await seedInitialTickets();
        } catch (e) {
          console.warn('Failed to seed initial data:', e);
        }
        return;
      }

      const list: TicketRecord[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as TicketRecord);
      });
      // Sort by ticketNumber ascending
      list.sort((a, b) => a.ticketNumber - b.ticketNumber);
      onUpdate(list);
    },
    (error) => {
      console.error('Snapshot error on tickets:', error);
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'tickets');
      } catch {
        // Handled
      }
    }
  );
}

// Seed initial tickets
export async function seedInitialTickets(): Promise<void> {
  const batch = writeBatch(db);
  for (const t of INITIAL_TICKETS) {
    const ref = doc(db, 'tickets', t.id);
    batch.set(ref, t);
  }
  try {
    await batch.commit();
    console.log('Initial sample tickets seeded to Firestore.');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'tickets');
  }
}

// Update single ticket
export async function updateFirestoreTicket(id: string, updates: Partial<TicketRecord>): Promise<void> {
  const ref = doc(db, 'tickets', id);
  try {
    await updateDoc(ref, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tickets/${id}`);
  }
}

// Set ticket (create or overwrite)
export async function setFirestoreTicket(ticket: TicketRecord): Promise<void> {
  const ref = doc(db, 'tickets', ticket.id);
  try {
    await setDoc(ref, ticket);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tickets/${ticket.id}`);
  }
}

// App settings doc interface
export interface SyncSettings {
  sheetUrl: string;
  autoSync: boolean;
  intervalSec: number;
  lastSyncedAt?: string;
  lastSyncCount?: number;
}

// Subscribe to global sync settings
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

// Save global sync settings
export async function saveSyncSettings(settings: SyncSettings): Promise<void> {
  const settingsRef = doc(db, 'settings', 'spreadsheet_sync');
  try {
    await setDoc(settingsRef, settings, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/spreadsheet_sync');
  }
}

// Replace all tickets (e.g. from CSV / Spreadsheet import or Reset)
export async function syncAllTicketsToFirestore(tickets: TicketRecord[]): Promise<void> {
  try {
    const existingSnap = await getDocs(collection(db, 'tickets'));
    const batch = writeBatch(db);
    
    // Delete docs not in new tickets
    const newIds = new Set(tickets.map(t => t.id));
    existingSnap.forEach(d => {
      if (!newIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    // Set all new tickets
    for (const t of tickets) {
      batch.set(doc(db, 'tickets', t.id), t);
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'tickets');
  }
}
