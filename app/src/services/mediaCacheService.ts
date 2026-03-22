import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { Entry, MediaInfo } from '@/src/types/entry';
import { MEDIA_PATHS } from '@/src/utils/fileSystem';
import { logger } from '@/src/utils/logger';

type MediaKind = 'photo' | 'voice';

function isRemoteUri(uri: string | undefined): boolean {
  return !!uri && /^https?:\/\//i.test(uri);
}

function normalizeRemoteUri(uri: string): string {
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
  if (kind === 'photo') {
    return variant === 'thumb' ? MEDIA_PATHS.photoThumbnail : MEDIA_PATHS.photoDisplay;
  }
  return MEDIA_PATHS.voiceCompressed;
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
    return targetUri;
  }

  await FileSystem.downloadAsync(normalized, targetUri);
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
      logger.warn('[mediaCache] failed to cache main media, fallback to remote uri:', error);
      nextUri = normalizeRemoteUri(remoteUri);
    }
  }

  if (remoteThumbnail) {
    try {
      nextThumbnail = await ensureCachedFile(remoteThumbnail, 'image/jpeg', 'photo', 'thumb');
    } catch (error) {
      logger.warn('[mediaCache] failed to cache thumbnail, fallback to remote uri:', error);
      nextThumbnail = normalizeRemoteUri(remoteThumbnail);
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

