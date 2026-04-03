jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: jest.fn().mockResolvedValue('https://server-a.example.com'),
  getCurrentServerUrlSync: jest.fn(() => 'https://server-a.example.com'),
  getServerKey: jest.fn((url: string) => 'env_https_server_a_example_com'),
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn().mockResolvedValue(null),
    getStringSync: jest.fn(() => null),
    setString: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  buildDataScopeKey,
  getCurrentDataScopeKey,
  getCurrentDataScopeKeySync,
} from '../workspaceService';
import { Storage } from '@/src/utils/storage';
import { getCurrentServerUrlSync } from '@/src/services/backendEnvironmentService';

const SERVER_A_SCOPE = 'env_https_server_a_example_com';
const scopedKey = (scope: string, key: string) => `${scope}:${key}`;

beforeEach(() => {
  jest.clearAllMocks();
  (getCurrentServerUrlSync as jest.Mock).mockReturnValue('https://server-a.example.com');
});

describe('buildDataScopeKey', () => {
  it('combines server key and userId', () => {
    expect(buildDataScopeKey('https://server-a.example.com', 'user-123')).toBe(
      'env_https_server_a_example_com_user-123',
    );
  });
});

describe('getCurrentDataScopeKeySync', () => {
  it('returns local when no serverUrl', () => {
    (getCurrentServerUrlSync as jest.Mock).mockReturnValue(null);
    expect(getCurrentDataScopeKeySync()).toBe('local');
  });

  it('returns local when no userId in MMKV', () => {
    (Storage.getStringSync as jest.Mock).mockReturnValue(null);
    expect(getCurrentDataScopeKeySync()).toBe('local');
  });

  it('returns scoped key when serverUrl and userId both present', () => {
    (Storage.getStringSync as jest.Mock).mockReturnValue('user-abc');
    expect(getCurrentDataScopeKeySync()).toBe('env_https_server_a_example_com_user-abc');
  });

  it('reads userId from correct MMKV key', () => {
    (Storage.getStringSync as jest.Mock).mockReturnValue('user-abc');
    getCurrentDataScopeKeySync();
    expect(Storage.getStringSync).toHaveBeenCalledWith(
      scopedKey(SERVER_A_SCOPE, 'workspace:currentUserId'),
    );
  });
});

describe('getCurrentDataScopeKey', () => {
  it('returns local when no userId in MMKV', async () => {
    (Storage.getString as jest.Mock).mockResolvedValue(null);
    await expect(getCurrentDataScopeKey()).resolves.toBe('local');
  });

  it('returns scoped key when userId present', async () => {
    (Storage.getString as jest.Mock).mockResolvedValue('user-xyz');
    await expect(getCurrentDataScopeKey()).resolves.toBe('env_https_server_a_example_com_user-xyz');
  });
});
