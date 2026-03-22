import { useSyncStore } from '../syncStore';
import { useCloudSyncIndicatorStore } from '../cloudSyncIndicatorStore';
import * as DB from '@/src/database/operations';

let mockIsAuthenticated = true;
let mockCloudMode: boolean | 'switching' = true;

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn(async () => null),
    setString: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
  },
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      isAuthenticated: mockIsAuthenticated,
    }),
  },
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      cloudMode: mockCloudMode,
    }),
  },
}));

jest.mock('@/src/database/operations', () => ({
  getCloudSyncIndicatorSummary: jest.fn(async () => ({
    pendingEntries: 0,
    pendingUploads: 0,
    uploadingEntries: 0,
    failedEntries: 0,
  })),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('cloudSyncIndicatorStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockCloudMode = true;
    useSyncStore.setState({
      syncCursor: 0,
      lastSyncAt: null,
      lastSyncError: null,
      initialSyncState: 'idle',
      isSyncing: false,
      isLoaded: true,
    });
    useCloudSyncIndicatorStore.setState({
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      uiState: 'hidden',
    });
  });

  it('returns hidden when cloud mode is disabled', async () => {
    mockCloudMode = false;

    await useCloudSyncIndicatorStore.getState().refresh();

    expect(useCloudSyncIndicatorStore.getState().uiState).toBe('hidden');
  });

  it('prioritizes syncing over failed and pending when uploads are active', async () => {
    useSyncStore.setState({ isSyncing: false, lastSyncError: 'network error' });
    (DB.getCloudSyncIndicatorSummary as jest.Mock).mockResolvedValueOnce({
      pendingEntries: 1,
      pendingUploads: 1,
      uploadingEntries: 1,
      failedEntries: 1,
    });

    await useCloudSyncIndicatorStore.getState().refresh();

    expect(useCloudSyncIndicatorStore.getState().uiState).toBe('syncing');
  });

  it('prioritizes failed over pending when sync is idle', async () => {
    useSyncStore.setState({ isSyncing: false, lastSyncError: 'network error' });
    (DB.getCloudSyncIndicatorSummary as jest.Mock).mockResolvedValueOnce({
      pendingEntries: 2,
      pendingUploads: 1,
      uploadingEntries: 0,
      failedEntries: 1,
    });

    await useCloudSyncIndicatorStore.getState().refresh();

    expect(useCloudSyncIndicatorStore.getState().uiState).toBe('failed');
  });
});
