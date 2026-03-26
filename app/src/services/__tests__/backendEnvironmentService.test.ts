jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn().mockResolvedValue(null),
    getStringSync: jest.fn().mockReturnValue(null),
    setString: jest.fn().mockResolvedValue(undefined),
    setObject: jest.fn().mockResolvedValue(undefined),
    getObject: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { Storage } from '@/src/utils/storage';
import {
  clearCurrentServerUrl,
  getCurrentServerUrl,
  getCurrentServerUrlSync,
  getRecentServerUrls,
  getServerKey,
  normalizeServerUrl,
  rememberServerUrl,
  setCurrentServerUrl,
} from '../backendEnvironmentService';

describe('backendEnvironmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes server urls by trimming spaces and trailing slash', () => {
    expect(normalizeServerUrl(' https://api.example.com/ ')).toBe('https://api.example.com');
    expect(normalizeServerUrl('http://localhost:8080///')).toBe('http://localhost:8080');
  });

  it('strips a trailing /api suffix while preserving nested base paths', () => {
    expect(normalizeServerUrl('https://api.example.com/app/api/')).toBe('https://api.example.com/app');
    expect(normalizeServerUrl('https://api.example.com/app/API')).toBe('https://api.example.com/app');
  });

  it('rejects invalid server urls', () => {
    expect(() => normalizeServerUrl('not-a-url')).toThrow('Invalid server URL');
  });

  it('builds a stable server key from normalized url', () => {
    expect(getServerKey('https://api.example.com/')).toBe('env_https_api_example_com');
    expect(getServerKey('http://localhost:8080')).toBe('env_http_localhost_8080');
  });

  it('falls back to the current EXPO_PUBLIC_API_URL host when no saved server exists', async () => {
    const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080/api';

    await expect(getCurrentServerUrl()).resolves.toBe('http://localhost:8080');

    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  });

  it('persists current server url after normalization', async () => {
    await setCurrentServerUrl('https://api.example.com/');

    expect(Storage.setString).toHaveBeenCalledWith('backend:currentServerUrl', 'https://api.example.com');
  });

  it('reads the normalized current server url from sync storage when cache is cold', () => {
    void clearCurrentServerUrl();
    (Storage.getStringSync as jest.Mock | undefined)?.mockReturnValueOnce?.('https://sync.example.com/api/');

    expect(getCurrentServerUrlSync()).toBe('https://sync.example.com');
  });

  it('clears the persisted current server url', async () => {
    await clearCurrentServerUrl();

    expect(Storage.delete).toHaveBeenCalledWith('backend:currentServerUrl');
  });

  it('keeps recent urls unique and ordered by most recent first', async () => {
    (Storage.getObject as jest.Mock).mockResolvedValueOnce([
      'https://two.example.com',
      'https://one.example.com',
    ]);

    await rememberServerUrl('https://one.example.com');

    expect(Storage.setObject).toHaveBeenCalledWith('backend:recentServerUrls', [
      'https://one.example.com',
      'https://two.example.com',
    ]);
  });

  it('limits recent urls to five entries', async () => {
    (Storage.getObject as jest.Mock).mockResolvedValueOnce([
      'https://five.example.com',
      'https://four.example.com',
      'https://three.example.com',
      'https://two.example.com',
      'https://one.example.com',
    ]);

    await rememberServerUrl('https://six.example.com');

    expect(Storage.setObject).toHaveBeenCalledWith('backend:recentServerUrls', [
      'https://six.example.com',
      'https://five.example.com',
      'https://four.example.com',
      'https://three.example.com',
      'https://two.example.com',
    ]);
  });

  it('reads recent urls as an empty list when storage is empty', async () => {
    (Storage.getObject as jest.Mock).mockResolvedValueOnce(null);

    await expect(getRecentServerUrls()).resolves.toEqual([]);
  });
});
