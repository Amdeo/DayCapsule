/**
 * HTTP API Client
 * fetch-based, auto auth headers, token refresh with lock, timeout, error normalization
 */

import { Storage } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';
import { Platform } from 'react-native';
import { getCurrentServerUrlSync, getServerKey } from '@/src/services/backendEnvironmentService';
import {
  getActiveAccountRefSync,
  getUserAuthKeys,
} from '@/src/services/accountRegistryService';
import { withScope } from '@/src/utils/storage';

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

export interface UploadFileMetadata {
  traceId?: string;
  localMediaId?: string;
  persistedHash?: string;
  sourceHash?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface UploadFileOptions {
  metadata?: UploadFileMetadata;
}

export interface UploadFileResponse {
  id: string;
  url: string;
  remoteHash?: string;
  validationStatus?: string;
  validationError?: string | null;
}

export interface ApiClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  uploadFile(
    path: string,
    fileUri: string,
    fieldName: string,
    options?: UploadFileOptions
  ): Promise<UploadFileResponse>;
}

export function normalizeApiBaseURL(
  baseURL: string,
  platformOS: 'ios' | 'android' | 'web' | string = Platform.OS
): string {
  if (platformOS === 'android') {
    return baseURL
      .replace(/^http:\/\/localhost(?=[:/])/i, 'http://10.0.2.2')
      .replace(/^http:\/\/127\.0\.0\.1(?=[:/])/i, 'http://10.0.2.2');
  }

  return baseURL
    .replace(/^http:\/\/10\.0\.2\.2(?=[:/])/i, 'http://localhost');
}

export function createApiClient(baseURL: string): ApiClient {
  let refreshPromise: Promise<boolean> | null = null;

  const getNetworkErrorMessage = (error: unknown, fallbackMessage: string): string => {
    if (error instanceof Error) {
      return error.message;
    }

    return fallbackMessage;
  };

  const getScopedAuthKey = (key: string): string => {
    const currentServerUrl = getCurrentServerUrlSync();
    if (!currentServerUrl) {
      return key;
    }

    const activeRef = getActiveAccountRefSync();
    if (activeRef?.userId) {
      const keys = getUserAuthKeys(currentServerUrl, activeRef.userId);
      if (key === 'auth:token') return keys.tokenKey;
      if (key === 'auth:refreshToken') return keys.refreshTokenKey;
      if (key === 'auth:user') return keys.userKey;
    }

    // fallback: server-scoped（未登录时或 key 不是 auth key）
    return withScope(getServerKey(currentServerUrl), key);
  };

  const buildUrl = (path: string, params?: Record<string, string>): string => {
    const url = `${baseURL}${path}`;
    if (!params || Object.keys(params).length === 0) return url;
    const qs = new URLSearchParams(params).toString();
    return `${url}?${qs}`;
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await Storage.getString(getScopedAuthKey('auth:token'));
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const buildResponsePreview = (rawText: string): string => {
    const normalized = rawText.replace(/\s+/g, ' ').trim();
    return normalized.length > 160 ? `${normalized.slice(0, 160)}...` : normalized;
  };

  const parseApiResponse = async <T>(res: Response, requestUrl: string): Promise<ApiResponse<T>> => {
    if (typeof res.text !== 'function') {
      return res.json() as Promise<ApiResponse<T>>;
    }

    const rawText = await res.text();
    if (rawText.trim() === '') {
      throw new ApiError(
        'INVALID_RESPONSE',
        `Empty response from ${requestUrl}`,
        res.status,
      );
    }

    try {
      return JSON.parse(rawText) as ApiResponse<T>;
    } catch {
      const contentType = res.headers.get('content-type') ?? 'unknown';
      const preview = buildResponsePreview(rawText);
      logger.error('[apiClient] Non-JSON response:', {
        url: requestUrl,
        status: res.status,
        contentType,
        bodyPreview: preview,
      });
      throw new ApiError(
        'INVALID_RESPONSE',
        `Non-JSON response from ${requestUrl} (${contentType}): ${preview}`,
        res.status,
      );
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenKey = getScopedAuthKey('auth:refreshToken');
      const tokenKey = getScopedAuthKey('auth:token');
      const rt = await Storage.getString(refreshTokenKey);
      if (!rt) return false;

      const refreshUrl = `${baseURL}/auth/refresh`;
      const res = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) return false;

      const json = await parseApiResponse<{ token: string; refreshToken: string }>(res, refreshUrl);
      if (!json.success || !json.data) return false;

      await Storage.setString(tokenKey, json.data.token);
      await Storage.setString(refreshTokenKey, json.data.refreshToken);
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
      const url = buildUrl(path);
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const json = await parseApiResponse<T>(res, url);

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
      throw new ApiError('NETWORK_ERROR', getNetworkErrorMessage(e, 'Network request failed'), 0);
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
      const json = await parseApiResponse<T>(res, url);

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
      throw new ApiError('NETWORK_ERROR', getNetworkErrorMessage(e, 'Network request failed'), 0);
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

    uploadFile: async (
      path: string,
      fileUri: string,
      fieldName: string,
      options?: UploadFileOptions,
    ) => {
      const authHeaders = await getAuthHeaders();
      const formData = new FormData();
      const filename = fileUri.split('/').pop() ?? 'file';
      formData.append(fieldName, { uri: fileUri, name: filename, type: 'application/octet-stream' } as any);
      const uploadMetadata = options?.metadata;
      if (uploadMetadata) {
        Object.entries(uploadMetadata).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            return;
          }
          formData.append(key, String(value));
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);

      try {
        const uploadUrl = `${baseURL}${path}`;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { ...authHeaders },
          body: formData,
          signal: controller.signal,
        });

        const json = await parseApiResponse<UploadFileResponse>(res, uploadUrl);
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
        throw new ApiError('NETWORK_ERROR', getNetworkErrorMessage(e, 'Network request failed'), 0);
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}

/** Singleton instance — initialized lazily from env var */
let _client: ApiClient | null = null;

const toApiBaseURL = (serverUrl: string): string => `${serverUrl.replace(/\/+$/, '')}/api`;

const resolveApiBaseURL = (): string => {
  const currentServerUrl = getCurrentServerUrlSync();
  if (currentServerUrl) {
    return normalizeApiBaseURL(toApiBaseURL(currentServerUrl));
  }

  const configuredBaseURL = process.env.EXPO_PUBLIC_API_URL;
  if (!configuredBaseURL) {
    logger.warn('[apiClient] EXPO_PUBLIC_API_URL 未设置，回退到 http://localhost:8080/api');
  }

  return normalizeApiBaseURL(configuredBaseURL ?? 'http://localhost:8080/api');
};

export function getApiClient(): ApiClient {
  if (!_client) {
    const baseURL = resolveApiBaseURL();
    logger.info('[apiClient] Using base URL:', baseURL);
    _client = createApiClient(baseURL);
  }
  return _client;
}

export function resetApiClient(): void {
  _client = null;
}
