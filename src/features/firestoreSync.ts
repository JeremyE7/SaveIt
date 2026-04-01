import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseEnabled } from '../firebase';

const TRACKED_KEYS = [
  'expenses',
  'filteredExpenses',
  'incomes',
  'budgets',
  'customCategories',
  'userSettings',
  'budgetConfig',
  'subscriptions',
  'subscriptionNotifications',
  'hasMigratedTo503020',
] as const;

type TrackedKey = typeof TRACKED_KEYS[number];

const trackedKeySet = new Set<string>(TRACKED_KEYS);

let isPatched = false;
let isHydrating = false;
let syncDocRef: ReturnType<typeof doc> | null = null;
let syncSettledTimer: number | null = null;

type FirestoreSyncStatus = 'syncing' | 'synced' | 'error' | 'offline';

const emitSyncStatus = (status: FirestoreSyncStatus) => {
  window.dispatchEvent(new CustomEvent('firestoreSyncStatus', { detail: { status } }));
};

const emitSyncedWithDelay = () => {
  if (syncSettledTimer) {
    window.clearTimeout(syncSettledTimer);
  }

  syncSettledTimer = window.setTimeout(() => {
    emitSyncStatus('synced');
  }, 500);
};

const parseStorageValue = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const syncKeyToFirestore = async (key: string, value: string | null) => {
  if (!syncDocRef || !trackedKeySet.has(key)) return;

  try {
    emitSyncStatus('syncing');

    if (value === null) {
      await updateDoc(syncDocRef, { [key]: deleteField() });
      emitSyncedWithDelay();
      return;
    }

    await setDoc(syncDocRef, { [key]: parseStorageValue(value) }, { merge: true });
    emitSyncedWithDelay();
  } catch {
    emitSyncStatus('error');
    // Evitar bloquear UX por errores de red/sync
  }
};

const pushLocalSnapshotToFirestore = async () => {
  if (!syncDocRef) return;

  const payload: Record<string, unknown> = {};
  TRACKED_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      payload[key] = parseStorageValue(value);
    }
  });

  if (Object.keys(payload).length === 0) return;
  await setDoc(syncDocRef, payload, { merge: true });
};

const hydrateLocalStorageFromCloud = (data: Record<string, unknown>) => {
  isHydrating = true;
  try {
    TRACKED_KEYS.forEach((key) => {
      if (data[key] === undefined) return;
      localStorage.setItem(key, JSON.stringify(data[key]));
    });
  } finally {
    isHydrating = false;
  }
};

const patchLocalStorageForSync = () => {
  if (isPatched || typeof Storage === 'undefined') return;
  isPatched = true;

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this !== localStorage || isHydrating) return;
    void syncKeyToFirestore(key, value);
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
    originalRemoveItem.call(this, key);
    if (this !== localStorage || isHydrating) return;
    void syncKeyToFirestore(key, null);
  };

  Storage.prototype.clear = function patchedClear() {
    const keysBeforeClear = TRACKED_KEYS.filter((key) => this.getItem(key) !== null);
    originalClear.call(this);
    if (this !== localStorage || isHydrating) return;
    keysBeforeClear.forEach((key) => {
      void syncKeyToFirestore(key, null);
    });
  };
};

export const initializeFirestoreSync = async (): Promise<void> => {
  if (!isFirebaseEnabled()) return;

  const db = getFirebaseDb();
  if (!db) return;

  const docId = import.meta.env.VITE_FIREBASE_DOC_ID || 'default';
  syncDocRef = doc(db, 'saveit', docId);

  patchLocalStorageForSync();

  try {
    emitSyncStatus('syncing');
    const snapshot = await getDoc(syncDocRef);

    if (snapshot.exists()) {
      hydrateLocalStorageFromCloud(snapshot.data() as Record<string, unknown>);
    } else {
      await pushLocalSnapshotToFirestore();
    }

    emitSyncStatus('synced');
  } catch {
    emitSyncStatus('offline');
    // Si Firestore falla, app sigue funcionando local
  }
};

export const isTrackedStorageKey = (key: string): key is TrackedKey => trackedKeySet.has(key);
