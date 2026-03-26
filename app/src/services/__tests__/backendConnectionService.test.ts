const mockFetch = jest.fn();
(global as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch;
const mockNormalizeServerUrl = jest.fn((url: string) => url.trim().replace(/\/+$/, ''));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  normalizeServerUrl: (...args: unknown[]) => mockNormalizeServerUrl(...args as [string]),
}));

import { testBackendConnection } from '../backendConnectionService';

describe('backendConnectionService', () => {
  let originalSetTimeout: typeof global.setTimeout;
  let originalClearTimeout: typeof global.clearTimeout;

  beforeAll(() => {
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;
  });

  afterAll(() => {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockNormalizeServerUrl.mockImplementation((url: string) => url.trim().replace(/\/+$/, ''));
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

  it('returns validation failures without issuing a network request', async () => {
    mockNormalizeServerUrl.mockImplementationOnce(() => {
      throw new Error('Invalid server URL');
    });

    await expect(testBackendConnection('not-a-url')).resolves.toEqual({
      success: false,
      message: 'Invalid server URL',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('falls back to a generic failure message for non-Error rejections', async () => {
    mockFetch.mockRejectedValueOnce('socket hang up');

    await expect(testBackendConnection('https://api.example.com')).resolves.toEqual({
      success: false,
      message: '连接失败',
    });
  });

  it('returns a timeout failure when the request is aborted by the timeout guard', async () => {
    const clearTimeoutSpy = jest.fn();
    global.clearTimeout = clearTimeoutSpy as typeof global.clearTimeout;
    global.setTimeout = ((handler: TimerHandler) => {
      handler as () => void;
      (handler as () => void)();
      return 123 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof global.setTimeout;

    mockFetch.mockImplementationOnce(async (_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      const error = new Error('aborted');
      Object.defineProperty(error, 'name', {
        value: signal?.aborted ? 'AbortError' : 'Error',
        configurable: true,
      });
      throw error;
    });

    await expect(testBackendConnection('https://api.example.com', 1)).resolves.toEqual({
      success: false,
      message: '请求超时',
    });
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
