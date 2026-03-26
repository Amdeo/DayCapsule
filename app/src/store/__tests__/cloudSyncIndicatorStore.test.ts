import { useSyncStore } from '../syncStore';
import { useCloudSyncIndicatorStore } from '../cloudSyncIndicatorStore';
import * as DB from '@/src/database/operations';
import { logger } from '@/src/utils/logger';

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
    useCloudSyncIndicatorStore.setState({
      pendingEntries: 3,
      pendingUploads: 2,
      uploadingEntries: 1,
      failedEntries: 1,
      uiState: 'failed',
    });
    mockCloudMode = false;

    await useCloudSyncIndicatorStore.getState().refresh();

    expect(useCloudSyncIndicatorStore.getState()).toMatchObject({
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      uiState: 'hidden',
    });
  });

  it('returns hidden and clears stale counts when cloud mode is switching', async () => {
    useCloudSyncIndicatorStore.setState({
      pendingEntries: 5,
      pendingUploads: 4,
      uploadingEntries: 1,
      failedEntries: 2,
      uiState: 'pending',
    });
    mockCloudMode = 'switching';

    await useCloudSyncIndicatorStore.getState().refresh();

    expect(useCloudSyncIndicatorStore.getState()).toMatchObject({
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      uiState: 'hidden',
    });
  });

  it('returns hidden when the user is not authenticated', async () => {
    mockIsAuthenticated = false;

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

  it('returns pending when there are pending entries and uploads without active failures', async () => {
    (DB.getCloudSyncIndicatorSummary as jest.Mock).mockResolvedValueOnce({
      pendingEntries: 2,
      pendingUploads: 1,
      uploadingEntries: 0,
      failedEntries: 0,
    });

    await useCloudSyncIndicatorStore.getState().refresh();

    expect(useCloudSyncIndicatorStore.getState()).toMatchObject({
      pendingEntries: 2,
      pendingUploads: 1,
      uploadingEntries: 0,
      failedEntries: 0,
      uiState: 'pending',
    });
  });

  it('returns synced when the latest summary is fully clean', async () => {
    (DB.getCloudSyncIndicatorSummary as jest.Mock).mockResolvedValueOnce({
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
    });

    await useCloudSyncIndicatorStore.getState().refresh();

    expect(useCloudSyncIndicatorStore.getState()).toMatchObject({
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      uiState: 'synced',
    });
  });

  it('keeps the previous indicator state and logs a warning when refresh fails', async () => {
    useCloudSyncIndicatorStore.setState({
      pendingEntries: 1,
      pendingUploads: 1,
      uploadingEntries: 0,
      failedEntries: 0,
      uiState: 'pending',
    });
    (DB.getCloudSyncIndicatorSummary as jest.Mock).mockRejectedValueOnce(new Error('db unavailable'));

    await useCloudSyncIndicatorStore.getState().refresh();

    expect(useCloudSyncIndicatorStore.getState()).toMatchObject({
      pendingEntries: 1,
      pendingUploads: 1,
      uploadingEntries: 0,
      failedEntries: 0,
      uiState: 'pending',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      '[cloudSyncIndicatorStore] refresh failed:',
      expect.any(Error)
    );
  });
});
