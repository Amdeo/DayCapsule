import { create } from 'zustand';
import { Storage, withScope } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';
import { getCurrentServerUrl, getServerKey } from '@/src/services/backendEnvironmentService';

export type InitialSyncState =
  | 'idle'
  | 'checking'
  | 'restoring'
  | 'backing-up'
  | 'needs-decision'
  | 'ready';

export type MediaSyncValidationSummary = {
  status: 'idle' | 'running' | 'success' | 'partial' | 'failed';
  total: number;
  downloaded: number;
  missing: number;
  failed: number;
  suspect: number;
  repairable: number;
  lastError: string | null;
  lastValidatedAt: number | null;
};

export const SYNC_STORAGE_KEYS = {
  cursor: 'cloudSync:cursor',
  lastSyncAt: 'cloudSync:lastSyncAt',
  lastSyncError: 'cloudSync:lastSyncError',
  initialSyncState: 'cloudSync:initialSyncState',
  lastMediaValidationSummary: 'cloudSync:lastMediaValidationSummary',
} as const;

interface SyncStoreState {
  syncCursor: number;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  initialSyncState: InitialSyncState;
  lastMediaValidationSummary: MediaSyncValidationSummary | null;
  isSyncing: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  setCursor: (cursor: number) => Promise<void>;
  markSyncStarted: () => Promise<void>;
  markSyncFinished: () => Promise<void>;
  markSyncSuccess: (timestamp?: number) => Promise<void>;
  markSyncFailure: (message: string) => Promise<void>;
  setInitialSyncState: (state: InitialSyncState) => Promise<void>;
  setMediaValidationSummary: (summary: MediaSyncValidationSummary) => Promise<void>;
  markMediaValidationRunning: (total: number) => Promise<void>;
  reset: () => Promise<void>;
}

const DEFAULT_SYNC_STATE = {
  syncCursor: 0,
  lastSyncAt: null,
  lastSyncError: null,
  initialSyncState: 'idle' as InitialSyncState,
  lastMediaValidationSummary: null as MediaSyncValidationSummary | null,
  isSyncing: false,
  isLoaded: false,
};

const getScopedSyncKey = async (key: string): Promise<string> => {
  const serverUrl = await getCurrentServerUrl();
  return withScope(getServerKey(serverUrl), key);
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

const isMediaSyncValidationStatus = (
  value: unknown
): value is MediaSyncValidationSummary['status'] =>
  value === 'idle' || value === 'running' || value === 'success' || value === 'partial' || value === 'failed';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || isFiniteNumber(value);

const isMediaSyncValidationSummary = (value: unknown): value is MediaSyncValidationSummary => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const summary = value as Record<string, unknown>;
  return (
    isMediaSyncValidationStatus(summary.status) &&
    isFiniteNumber(summary.total) &&
    isFiniteNumber(summary.downloaded) &&
    isFiniteNumber(summary.missing) &&
    isFiniteNumber(summary.failed) &&
    isFiniteNumber(summary.suspect) &&
    isFiniteNumber(summary.repairable) &&
    isNullableString(summary.lastError) &&
    isNullableNumber(summary.lastValidatedAt)
  );
};

const parseMediaValidationSummary = (raw: string | null): MediaSyncValidationSummary | null => {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isMediaSyncValidationSummary(parsed)) return null;
    return parsed;
  } catch (error) {
    logger.error('[syncStore] Failed to parse media validation summary:', error);
    return null;
  }
};

const serializeMediaValidationSummary = (summary: MediaSyncValidationSummary): string =>
  JSON.stringify(summary);

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...DEFAULT_SYNC_STATE,

  load: async () => {
    try {
      const [
        cursorKey,
        lastSyncAtKey,
        lastSyncErrorKey,
        initialSyncStateKey,
        lastMediaValidationSummaryKey,
      ] = await Promise.all([
        getScopedSyncKey(SYNC_STORAGE_KEYS.cursor),
        getScopedSyncKey(SYNC_STORAGE_KEYS.lastSyncAt),
        getScopedSyncKey(SYNC_STORAGE_KEYS.lastSyncError),
        getScopedSyncKey(SYNC_STORAGE_KEYS.initialSyncState),
        getScopedSyncKey(SYNC_STORAGE_KEYS.lastMediaValidationSummary),
      ]);
      const [cursorRaw, lastSyncAtRaw, lastSyncError, initialSyncStateRaw, mediaValidationRaw] =
        await Promise.all([
          Storage.getString(cursorKey),
          Storage.getString(lastSyncAtKey),
          Storage.getString(lastSyncErrorKey),
          Storage.getString(initialSyncStateKey),
          Storage.getString(lastMediaValidationSummaryKey),
        ]);

      set({
        syncCursor: parseNumber(cursorRaw) ?? 0,
        lastSyncAt: parseNumber(lastSyncAtRaw),
        lastSyncError: lastSyncError ?? null,
        initialSyncState: parseInitialSyncState(initialSyncStateRaw),
        lastMediaValidationSummary: parseMediaValidationSummary(mediaValidationRaw),
        isSyncing: false,
        isLoaded: true,
      });
    } catch (error) {
      logger.error('[syncStore] Failed to load sync state:', error);
      set({ ...DEFAULT_SYNC_STATE, isLoaded: true });
    }
  },

  setCursor: async (cursor) => {
    await Storage.setString(await getScopedSyncKey(SYNC_STORAGE_KEYS.cursor), String(cursor));
    set({ syncCursor: cursor });
  },

  markSyncStarted: async () => {
    set({ isSyncing: true });
  },

  markSyncFinished: async () => {
    set({ isSyncing: false });
  },

  markSyncSuccess: async (timestamp = Date.now()) => {
    const [lastSyncAtKey, lastSyncErrorKey] = await Promise.all([
      getScopedSyncKey(SYNC_STORAGE_KEYS.lastSyncAt),
      getScopedSyncKey(SYNC_STORAGE_KEYS.lastSyncError),
    ]);
    await Promise.all([
      Storage.setString(lastSyncAtKey, String(timestamp)),
      Storage.delete(lastSyncErrorKey),
    ]);
    set({
      lastSyncAt: timestamp,
      lastSyncError: null,
    });
  },

  markSyncFailure: async (message) => {
    await Storage.setString(await getScopedSyncKey(SYNC_STORAGE_KEYS.lastSyncError), message);
    set({ lastSyncError: message });
  },

  setInitialSyncState: async (state) => {
    await Storage.setString(await getScopedSyncKey(SYNC_STORAGE_KEYS.initialSyncState), state);
    set({ initialSyncState: state });
  },

  setMediaValidationSummary: async (summary) => {
    await Storage.setString(
      await getScopedSyncKey(SYNC_STORAGE_KEYS.lastMediaValidationSummary),
      serializeMediaValidationSummary(summary)
    );
    set({ lastMediaValidationSummary: summary });
  },

  markMediaValidationRunning: async (total) => {
    const summary: MediaSyncValidationSummary = {
      status: 'running',
      total,
      downloaded: 0,
      missing: 0,
      failed: 0,
      suspect: 0,
      repairable: 0,
      lastError: null,
      lastValidatedAt: null,
    };
    await Storage.setString(
      await getScopedSyncKey(SYNC_STORAGE_KEYS.lastMediaValidationSummary),
      serializeMediaValidationSummary(summary)
    );
    set({ lastMediaValidationSummary: summary });
  },

  reset: async () => {
    const [
      cursorKey,
      lastSyncAtKey,
      lastSyncErrorKey,
      initialSyncStateKey,
      lastMediaValidationSummaryKey,
    ] = await Promise.all([
      getScopedSyncKey(SYNC_STORAGE_KEYS.cursor),
      getScopedSyncKey(SYNC_STORAGE_KEYS.lastSyncAt),
      getScopedSyncKey(SYNC_STORAGE_KEYS.lastSyncError),
      getScopedSyncKey(SYNC_STORAGE_KEYS.initialSyncState),
      getScopedSyncKey(SYNC_STORAGE_KEYS.lastMediaValidationSummary),
    ]);
    await Promise.all([
      Storage.delete(cursorKey),
      Storage.delete(lastSyncAtKey),
      Storage.delete(lastSyncErrorKey),
      Storage.delete(initialSyncStateKey),
      Storage.delete(lastMediaValidationSummaryKey),
    ]);
    set({ ...DEFAULT_SYNC_STATE, isLoaded: true });
  },
}));
