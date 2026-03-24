import { Storage } from '@/src/utils/storage';

const CURRENT_SERVER_URL_KEY = 'backend:currentServerUrl';
const RECENT_SERVER_URLS_KEY = 'backend:recentServerUrls';
const RECENT_SERVER_URLS_LIMIT = 5;
let currentServerUrlCache: string | null = null;

const ensureUrl = (value: string): URL => {
  try {
    return new URL(value);
  } catch {
    throw new Error('Invalid server URL');
  }
};

const stripApiSuffix = (pathname: string): string => pathname.replace(/\/api\/?$/i, '') || '/';

const buildServerUrlFromUrl = (value: string): string => {
  const url = ensureUrl(value);
  const pathname = stripApiSuffix(url.pathname);
  const normalizedPathname = pathname === '/' ? '' : pathname.replace(/\/+$/, '');
  return `${url.origin}${normalizedPathname}`;
};

export const normalizeServerUrl = (url: string): string => {
  const trimmed = url.trim().replace(/\/+$/, '');
  return buildServerUrlFromUrl(trimmed);
};

export const getServerKey = (url: string): string => {
  const normalizedUrl = normalizeServerUrl(url)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `env_${normalizedUrl}`;
};

const getFallbackServerUrl = (): string => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!envApiUrl) {
    throw new Error('No server URL configured');
  }

  return buildServerUrlFromUrl(envApiUrl);
};

export const getCurrentServerUrl = async (): Promise<string> => {
  const storedUrl = await Storage.getString(CURRENT_SERVER_URL_KEY);
  if (storedUrl) {
    const normalizedUrl = normalizeServerUrl(storedUrl);
    currentServerUrlCache = normalizedUrl;
    return normalizedUrl;
  }

  const fallbackUrl = getFallbackServerUrl();
  currentServerUrlCache = fallbackUrl;
  return fallbackUrl;
};

export const setCurrentServerUrl = async (url: string): Promise<void> => {
  const normalizedUrl = normalizeServerUrl(url);
  currentServerUrlCache = normalizedUrl;
  await Storage.setString(CURRENT_SERVER_URL_KEY, normalizedUrl);
};

export const clearCurrentServerUrl = async (): Promise<void> => {
  currentServerUrlCache = null;
  await Storage.delete(CURRENT_SERVER_URL_KEY);
};

export const getCurrentServerUrlSync = (): string | null => {
  if (currentServerUrlCache) {
    return currentServerUrlCache;
  }

  const storedUrl = Storage.getStringSync?.(CURRENT_SERVER_URL_KEY);
  if (storedUrl) {
    const normalizedUrl = normalizeServerUrl(storedUrl);
    currentServerUrlCache = normalizedUrl;
    return normalizedUrl;
  }

  const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!envApiUrl) {
    return null;
  }

  const fallbackUrl = buildServerUrlFromUrl(envApiUrl);
  currentServerUrlCache = fallbackUrl;
  return fallbackUrl;
};

export const getRecentServerUrls = async (): Promise<string[]> => {
  const recentUrls = await Storage.getObject<string[]>(RECENT_SERVER_URLS_KEY);
  if (!Array.isArray(recentUrls)) {
    return [];
  }

  return recentUrls;
};

export const rememberServerUrl = async (url: string): Promise<void> => {
  const normalizedUrl = normalizeServerUrl(url);
  const recentUrls = await getRecentServerUrls();
  const nextRecentUrls = [normalizedUrl, ...recentUrls.filter(item => item !== normalizedUrl)]
    .slice(0, RECENT_SERVER_URLS_LIMIT);

  await Storage.setObject(RECENT_SERVER_URLS_KEY, nextRecentUrls);
};
