import { Storage } from '@/src/utils/storage';
import { useSyncStore } from '../syncStore';

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn(async () => null),
    setString: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
  },
}));

describe('syncStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSyncStore.setState({
      syncCursor: 0,
      lastSyncAt: null,
      lastSyncError: null,
      initialSyncState: 'idle',
      isSyncing: false,
      isLoaded: false,
    });
  });

  it('loads persisted sync cursor and initial sync state from storage', async () => {
    (Storage.getString as jest.Mock).mockImplementation(async (key: string) => {
      switch (key) {
        case 'cloudSync:cursor':
          return '12';
        case 'cloudSync:lastSyncAt':
          return '1700000000000';
        case 'cloudSync:lastSyncError':
          return 'network timeout';
        case 'cloudSync:initialSyncState':
          return 'needs-decision';
        default:
          return null;
      }
    });

    await useSyncStore.getState().load();

    expect(useSyncStore.getState()).toMatchObject({
      syncCursor: 12,
      lastSyncAt: 1700000000000,
      lastSyncError: 'network timeout',
      initialSyncState: 'needs-decision',
      isLoaded: true,
    });
  });

  it('clears lastSyncError after a successful sync status update', async () => {
    useSyncStore.setState({
      syncCursor: 3,
      lastSyncAt: null,
      lastSyncError: 'network timeout',
      initialSyncState: 'checking',
      isSyncing: false,
      isLoaded: true,
    });

    await useSyncStore.getState().markSyncSuccess(1700000000123);

    expect(useSyncStore.getState()).toMatchObject({
      lastSyncAt: 1700000000123,
      lastSyncError: null,
    });
    expect(Storage.delete).toHaveBeenCalledWith('cloudSync:lastSyncError');
  });

  it('toggles isSyncing when sync starts and finishes', async () => {
    await useSyncStore.getState().markSyncStarted();
    expect(useSyncStore.getState().isSyncing).toBe(true);

    await useSyncStore.getState().markSyncFinished();
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });
});
