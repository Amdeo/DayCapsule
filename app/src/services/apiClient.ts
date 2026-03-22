/**
 * HTTP API Client
 * fetch-based, auto auth headers, token refresh with lock, timeout, error normalization
 */

import { Storage } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface ApiClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  uploadFile(path: string, fileUri: string, fieldName: string): Promise<{ id: string; url: string }>;
}

export function createApiClient(baseURL: string): ApiClient {
  let refreshPromise: Promise<boolean> | null = null;

  const buildUrl = (path: string, params?: Record<string, string>): string => {
    const url = `${baseURL}${path}`;
    if (!params || Object.keys(params).length === 0) return url;
    const qs = new URLSearchParams(params).toString();
    return `${url}?${qs}`;
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await Storage.getString('auth:token');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const rt = await Storage.getString('auth:refreshToken');
      if (!rt) return false;

      const res = await fetch(`${baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) return false;

      const json: ApiResponse<{ token: string; refreshToken: string }> = await res.json();
      if (!json.success || !json.data) return false;

      await Storage.setString('auth:token', json.data.token);
      await Storage.setString('auth:refreshToken', json.data.refreshToken);
      return true;
    } catch (e) {
      logger.error('[apiClient] Token refresh failed:', e);
      return false;
    }
  };

  const refreshWithLock = (): Promise<boolean> => {
    if (refreshPromise) return refreshPromise;
    refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
    return refreshPromise;
  };

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
  ): Promise<T> => {
    const authHeaders = await getAuthHeaders();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(buildUrl(path), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const json: ApiResponse<T> = await res.json();

      if (res.ok && json.success) {
        return json.data as T;
      }

      if (res.status === 401 && !isRetry) {
        const refreshed = await refreshWithLock();
        if (refreshed) {
          return request<T>(method, path, body, true);
        }
      }

      throw new ApiError(
        json.error?.code ?? 'UNKNOWN_ERROR',
        json.error?.message ?? 'Request failed',
        res.status,
      );
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if ((e as Error).name === 'AbortError') {
        throw new ApiError('TIMEOUT', 'Request timed out', 0);
      }
      throw new ApiError('NETWORK_ERROR', (e as Error).message, 0);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const requestWithParams = async <T>(
    method: string,
    path: string,
    params?: Record<string, string>,
    isRetry = false,
  ): Promise<T> => {
    const authHeaders = await getAuthHeaders();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
    };

    const url = buildUrl(path, params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { method, headers, signal: controller.signal });
      const json: ApiResponse<T> = await res.json();

      if (res.ok && json.success) return json.data as T;

      if (res.status === 401 && !isRetry) {
        const refreshed = await refreshWithLock();
        if (refreshed) return requestWithParams<T>(method, path, params, true);
      }

      throw new ApiError(
        json.error?.code ?? 'UNKNOWN_ERROR',
        json.error?.message ?? 'Request failed',
        res.status,
      );
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if ((e as Error).name === 'AbortError') throw new ApiError('TIMEOUT', 'Request timed out', 0);
      throw new ApiError('NETWORK_ERROR', (e as Error).message, 0);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return {
    get: <T>(path: string, params?: Record<string, string>) =>
      requestWithParams<T>('GET', path, params),

    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),

    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),

    delete: <T>(path: string) => request<T>('DELETE', path),

    uploadFile: async (path: string, fileUri: string, fieldName: string) => {
      const authHeaders = await getAuthHeaders();
      const formData = new FormData();
      const filename = fileUri.split('/').pop() ?? 'file';
      formData.append(fieldName, { uri: fileUri, name: filename, type: 'application/octet-stream' } as any);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);

      try {
        const res = await fetch(`${baseURL}${path}`, {
          method: 'POST',
          headers: { ...authHeaders },
          body: formData,
          signal: controller.signal,
        });

        const json: ApiResponse<{ id: string; url: string }> = await res.json();
        if (res.ok && json.success && json.data) return json.data;

        throw new ApiError(
          json.error?.code ?? 'UPLOAD_FAILED',
          json.error?.message ?? 'Upload failed',
          res.status,
        );
      } catch (e) {
        if (e instanceof ApiError) throw e;
        if ((e as Error).name === 'AbortError') {
          throw new ApiError('TIMEOUT', 'Upload timed out', 0);
        }
        throw new ApiError('NETWORK_ERROR', (e as Error).message, 0);
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}

/** Singleton instance — initialized lazily from env var */
let _client: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!_client) {
    const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';
    _client = createApiClient(baseURL);
  }
  return _client;
}
