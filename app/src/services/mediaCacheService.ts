import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { Entry, MediaInfo } from '@/src/types/entry';
import { getCurrentServerUrlSync, getServerKey } from '@/src/services/backendEnvironmentService';
import { getMediaPaths } from '@/src/utils/fileSystem';
import { logger } from '@/src/utils/logger';
import { Storage, withScope } from '@/src/utils/storage';

type MediaKind = 'photo' | 'voice';
const MEDIA_API_PATH_RE = /^\/api\/media(?:\/|$)/i;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

function isRemoteUri(uri: string | undefined): boolean {
  return !!uri && (/^https?:\/\//i.test(uri) || MEDIA_API_PATH_RE.test(uri));
}

function getConfiguredServerUrl(): string | null {
  return getCurrentServerUrlSync()?.replace(/\/+$/, '') ?? null;
}

function buildConfiguredMediaUrl(uri: string, configuredServerUrl: string): string {
  if (MEDIA_API_PATH_RE.test(uri)) {
    return `${configuredServerUrl}${uri}`;
  }

  const parsed = new URL(uri);
  return `${configuredServerUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function getScopedAuthHeaders(): Record<string, string> | undefined {
  const currentServerUrl = getCurrentServerUrlSync();
  const scopedKey = currentServerUrl
    ? withScope(getServerKey(currentServerUrl), 'auth:token')
    : 'auth:token';
  const token = Storage.getStringSync(scopedKey) ?? (scopedKey === 'auth:token' ? null : Storage.getStringSync('auth:token'));
  if (!token) {
    return undefined;
  }

  return { Authorization: `Bearer ${token}` };
}

function normalizeRemoteUri(uri: string): string {
  const configuredServerUrl = getConfiguredServerUrl();
  if (configuredServerUrl) {
    if (MEDIA_API_PATH_RE.test(uri)) {
      return buildConfiguredMediaUrl(uri, configuredServerUrl);
    }

    if (/^https?:\/\//i.test(uri)) {
      try {
        const parsed = new URL(uri);
        if (LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
          return buildConfiguredMediaUrl(uri, configuredServerUrl);
        }
      } catch {
        return uri;
      }
    }
  }

  if (Platform.OS !== 'android') return uri;
  return uri
    .replace(/^http:\/\/localhost(?=[:/])/i, 'http://10.0.2.2')
    .replace(/^http:\/\/127\.0\.0\.1(?=[:/])/i, 'http://10.0.2.2');
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function extensionFromMimeType(mimeType?: string): string {
  if (!mimeType) return 'bin';
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('m4a') || mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'bin';
}

function getTargetDir(kind: MediaKind, variant: 'main' | 'thumb' = 'main'): string {
  const mediaPaths = getMediaPaths();
  if (kind === 'photo') {
    return variant === 'thumb' ? mediaPaths.photoThumbnail : mediaPaths.photoDisplay;
  }
  return mediaPaths.voiceCompressed;
}

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function ensureCachedFile(
  remoteUri: string,
  mimeType: string,
  kind: MediaKind,
  variant: 'main' | 'thumb' = 'main'
): Promise<string> {
  const normalized = normalizeRemoteUri(remoteUri);
  const targetDir = getTargetDir(kind, variant);
  const targetUri = `${targetDir}${hashString(normalized)}.${extensionFromMimeType(mimeType)}`;

  await ensureDir(targetDir);
  const info = await FileSystem.getInfoAsync(targetUri);
  if (info.exists) {
    logger.log('[mediaCache] cache hit', {
      remoteUri,
      normalizedUri: normalized,
      targetUri,
      kind,
      variant,
    });
    return targetUri;
  }

  const authHeaders = getScopedAuthHeaders();
  logger.log('[mediaCache] downloading media', {
    remoteUri,
    normalizedUri: normalized,
    targetUri,
    kind,
    variant,
    hasAuth: !!authHeaders?.Authorization,
  });
  await FileSystem.downloadAsync(
    normalized,
    targetUri,
    authHeaders ? { headers: authHeaders } : undefined,
  );
  logger.log('[mediaCache] media download complete', {
    normalizedUri: normalized,
    targetUri,
    kind,
    variant,
  });
  return targetUri;
}

async function hydrateMedia(entryType: Entry['type'], media: MediaInfo): Promise<MediaInfo> {
  const kind: MediaKind = entryType === 'voice' ? 'voice' : 'photo';
  const remoteUri = isRemoteUri(media.remoteUri) ? media.remoteUri : (isRemoteUri(media.uri) ? media.uri : undefined);
  const remoteThumbnail = isRemoteUri(media.remoteThumbnail)
    ? media.remoteThumbnail
    : (isRemoteUri(media.thumbnail) ? media.thumbnail : undefined);

  let nextUri = media.uri;
  let nextThumbnail = media.thumbnail;

  if (remoteUri) {
    try {
      nextUri = await ensureCachedFile(remoteUri, media.mimeType, kind, 'main');
    } catch (error) {
      const normalizedRemoteUri = normalizeRemoteUri(remoteUri);
      logger.warn('[mediaCache] failed to cache main media, fallback to remote uri:', {
        remoteUri,
        normalizedUri: normalizedRemoteUri,
        kind,
        variant: 'main',
      }, error);
      nextUri = normalizedRemoteUri;
    }
  }

  if (remoteThumbnail) {
    try {
      nextThumbnail = await ensureCachedFile(remoteThumbnail, 'image/jpeg', 'photo', 'thumb');
    } catch (error) {
      const normalizedRemoteThumbnail = normalizeRemoteUri(remoteThumbnail);
      logger.warn('[mediaCache] failed to cache thumbnail, fallback to remote uri:', {
        remoteUri: remoteThumbnail,
        normalizedUri: normalizedRemoteThumbnail,
        kind: 'photo',
        variant: 'thumb',
      }, error);
      nextThumbnail = normalizedRemoteThumbnail;
    }
  }

  return {
    ...media,
    uri: nextUri,
    remoteUri: remoteUri ? normalizeRemoteUri(remoteUri) : media.remoteUri,
    thumbnail: nextThumbnail,
    remoteThumbnail: remoteThumbnail ? normalizeRemoteUri(remoteThumbnail) : media.remoteThumbnail,
  };
}

export class MediaCacheService {
  static isRemoteUri = isRemoteUri;

  static normalizeRemoteUri = normalizeRemoteUri;

  static async hydrateEntry(entry: Entry): Promise<Entry> {
    if (!entry.media?.length) return entry;
    const hydratedMedia = await Promise.all(entry.media.map((media) => hydrateMedia(entry.type, media)));
    return { ...entry, media: hydratedMedia };
  }

  static async hydrateEntries(entries: Entry[]): Promise<Entry[]> {
    return Promise.all(entries.map((entry) => this.hydrateEntry(entry)));
  }
}
