const mockFetch = jest.fn();
(global as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch;

jest.mock('@/src/services/backendEnvironmentService', () => ({
  normalizeServerUrl: jest.fn((url: string) => url.trim().replace(/\/+$/, '')),
}));

import { testBackendConnection } from '../backendConnectionService';

describe('backendConnectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the health endpoint for a valid server url', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    await expect(testBackendConnection('https://api.example.com/')).resolves.toEqual({
      success: true,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('returns a structured failure for non-2xx responses', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(testBackendConnection('https://api.example.com')).resolves.toEqual({
      success: false,
      message: '服务返回 503',
    });
  });

  it('returns a structured failure for network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    await expect(testBackendConnection('https://api.example.com')).resolves.toEqual({
      success: false,
      message: 'network down',
    });
  });
});
