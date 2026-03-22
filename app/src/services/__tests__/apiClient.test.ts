/**
 * apiClient unit tests
 */

// Mock Storage before importing apiClient
jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn().mockResolvedValue(null),
    setString: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

import { createApiClient, ApiError } from '../apiClient';
import { Storage } from '@/src/utils/storage';
import { normalizeApiBaseURL } from '../apiClient';
import { logger } from '@/src/utils/logger';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('apiClient', () => {
  const client = createApiClient('https://api.test.com');

  it('normalizes Android emulator API host to localhost on iOS', () => {
    expect(normalizeApiBaseURL('http://10.0.2.2:3000/api', 'ios')).toBe(
      'http://localhost:3000/api'
    );
    expect(normalizeApiBaseURL('http://10.0.2.2:3000/api', 'web')).toBe(
      'http://localhost:3000/api'
    );
  });

  it('normalizes localhost API host to 10.0.2.2 on Android', () => {
    expect(normalizeApiBaseURL('http://localhost:3000/api', 'android')).toBe(
      'http://10.0.2.2:3000/api'
    );
    expect(normalizeApiBaseURL('http://127.0.0.1:3000/api', 'android')).toBe(
      'http://10.0.2.2:3000/api'
    );
  });

  it('GET request with params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: [1, 2, 3] }),
    });

    const result = await client.get<number[]>('/entries', { limit: '20' });
    expect(result).toEqual([1, 2, 3]);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/entries?limit=20',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('POST request with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ success: true, data: { id: '1' } }),
    });

    const result = await client.post<{ id: string }>('/entries', { content: 'hello' });
    expect(result).toEqual({ id: '1' });
  });

  it('attaches Authorization header when token exists', async () => {
    (Storage.getString as jest.Mock).mockResolvedValueOnce('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: {} }),
    });

    await client.get('/me');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('throws ApiError on non-success response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'bad input' },
      }),
    });

    await expect(client.post('/entries', {})).rejects.toThrow(ApiError);
  });

  it('surfaces invalid non-JSON responses with request context', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? 'text/plain' : null),
      },
      text: () => Promise.resolve('proxy error: connection refused'),
    });

    await expect(client.post('/sync', {})).rejects.toMatchObject({
      name: 'ApiError',
      code: 'INVALID_RESPONSE',
      status: 502,
      message: 'Non-JSON response from https://api.test.com/sync (text/plain): proxy error: connection refused',
    });
    expect(logger.error).toHaveBeenCalledWith('[apiClient] Non-JSON response:', {
      url: 'https://api.test.com/sync',
      status: 502,
      contentType: 'text/plain',
      bodyPreview: 'proxy error: connection refused',
    });
  });

  it('refreshes token on 401 and retries', async () => {
    (Storage.getString as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auth:token') return Promise.resolve('expired-token');
      if (key === 'auth:refreshToken') return Promise.resolve('refresh-token-1');
      return Promise.resolve(null);
    });

    // 401 response
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 401,
      json: () => Promise.resolve({ success: false, error: { code: 'UNAUTHORIZED', message: '' } }),
    });
    // refresh response
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: () => Promise.resolve({
        success: true,
        data: { token: 'new-token', refreshToken: 'new-refresh' },
      }),
    });
    // After refresh, update mock to return new token
    (Storage.getString as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auth:token') return Promise.resolve('new-token');
      if (key === 'auth:refreshToken') return Promise.resolve('new-refresh');
      return Promise.resolve(null);
    });
    // retry response
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: () => Promise.resolve({ success: true, data: { ok: true } }),
    });

    const result = await client.get<{ ok: boolean }>('/me');
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('normalizes upload network failures to ApiError', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(
      client.uploadFile('/media/upload', 'file:///voice.m4a', 'file')
    ).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NETWORK_ERROR',
      message: 'Network request failed',
    });
  });
});
