import { create } from 'zustand';
import { Storage } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';

export type InitialSyncState =
  | 'idle'
  | 'checking'
  | 'restoring'
  | 'backing-up'
  | 'needs-decision'
  | 'ready';

export const SYNC_STORAGE_KEYS = {
  cursor: 'cloudSync:cursor',
  lastSyncAt: 'cloudSync:lastSyncAt',
  lastSyncError: 'cloudSync:lastSyncError',
  initialSyncState: 'cloudSync:initialSyncState',
} as const;

interface SyncStoreState {
  syncCursor: number;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  initialSyncState: InitialSyncState;
  isSyncing: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  setCursor: (cursor: number) => Promise<void>;
  markSyncStarted: () => Promise<void>;
  markSyncFinished: () => Promise<void>;
  markSyncSuccess: (timestamp?: number) => Promise<void>;
  markSyncFailure: (message: string) => Promise<void>;
  setInitialSyncState: (state: InitialSyncState) => Promise<void>;
  reset: () => Promise<void>;
}

const DEFAULT_SYNC_STATE = {
  syncCursor: 0,
  lastSyncAt: null,
  lastSyncError: null,
  initialSyncState: 'idle' as InitialSyncState,
  isSyncing: false,
  isLoaded: false,
};

const parseNumber = (raw: string | null): number | null => {
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseInitialSyncState = (raw: string | null): InitialSyncState => {
  switch (raw) {
    case 'checking':
    case 'restoring':
    case 'backing-up':
    case 'needs-decision':
    case 'ready':
      return raw;
    default:
      return 'idle';
  }
};

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...DEFAULT_SYNC_STATE,

  load: async () => {
    try {
      const [cursorRaw, lastSyncAtRaw, lastSyncError, initialSyncStateRaw] = await Promise.all([
        Storage.getString(SYNC_STORAGE_KEYS.cursor),
        Storage.getString(SYNC_STORAGE_KEYS.lastSyncAt),
        Storage.getString(SYNC_STORAGE_KEYS.lastSyncError),
        Storage.getString(SYNC_STORAGE_KEYS.initialSyncState),
      ]);

      set({
        syncCursor: parseNumber(cursorRaw) ?? 0,
        lastSyncAt: parseNumber(lastSyncAtRaw),
        lastSyncError: lastSyncError ?? null,
        initialSyncState: parseInitialSyncState(initialSyncStateRaw),
        isSyncing: false,
        isLoaded: true,
      });
    } catch (error) {
      logger.error('[syncStore] Failed to load sync state:', error);
      set({ isSyncing: false, isLoaded: true });
    }
  },

  setCursor: async (cursor) => {
    await Storage.setString(SYNC_STORAGE_KEYS.cursor, String(cursor));
    set({ syncCursor: cursor });
  },

  markSyncStarted: async () => {
    set({ isSyncing: true });
  },

  markSyncFinished: async () => {
    set({ isSyncing: false });
  },

  markSyncSuccess: async (timestamp = Date.now()) => {
    await Promise.all([
      Storage.setString(SYNC_STORAGE_KEYS.lastSyncAt, String(timestamp)),
      Storage.delete(SYNC_STORAGE_KEYS.lastSyncError),
    ]);
    set({
      lastSyncAt: timestamp,
      lastSyncError: null,
    });
  },

  markSyncFailure: async (message) => {
    await Storage.setString(SYNC_STORAGE_KEYS.lastSyncError, message);
    set({ lastSyncError: message });
  },

  setInitialSyncState: async (state) => {
    await Storage.setString(SYNC_STORAGE_KEYS.initialSyncState, state);
    set({ initialSyncState: state });
  },

  reset: async () => {
    await Promise.all([
      Storage.delete(SYNC_STORAGE_KEYS.cursor),
      Storage.delete(SYNC_STORAGE_KEYS.lastSyncAt),
      Storage.delete(SYNC_STORAGE_KEYS.lastSyncError),
      Storage.delete(SYNC_STORAGE_KEYS.initialSyncState),
    ]);
    set({ ...DEFAULT_SYNC_STATE, isLoaded: true });
  },
}));
