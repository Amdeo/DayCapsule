import type { Entry, MediaInfo } from '@/src/types/entry';

const REMOTE_URI_RE = /^(?:https?:\/\/|\/api\/media(?:\/|$))/i;

function hasLocalMediaTarget(uri: string | undefined): boolean {
  return !!uri && !REMOTE_URI_RE.test(uri);
}

function hasRemoteMediaTarget(uri: string | undefined): boolean {
  return !!uri && REMOTE_URI_RE.test(uri);
}

export function isPhotoMediaPendingHydration(media: MediaInfo): boolean {
  const hasLocalPreview = hasLocalMediaTarget(media.thumbnail) || hasLocalMediaTarget(media.uri);
  const hasRemotePreview = [
    media.remoteThumbnail,
    media.thumbnail,
    media.remoteUri,
    media.uri,
  ].some(hasRemoteMediaTarget);

  return !hasLocalPreview && hasRemotePreview;
}

export function isVoiceMediaPendingHydration(media: MediaInfo | undefined): boolean {
  if (!media) {
    return false;
  }

  const hasLocalAudio = hasLocalMediaTarget(media.uri);
  const hasRemoteAudio = hasRemoteMediaTarget(media.remoteUri) || hasRemoteMediaTarget(media.uri);
  return !hasLocalAudio && hasRemoteAudio;
}

export function isEntryMediaPendingHydration(entry: Entry): boolean {
  if (!entry.media?.length) {
    return false;
  }

  if (entry.type === 'voice') {
    return isVoiceMediaPendingHydration(entry.media[0]);
  }

  if (entry.type === 'photo') {
    return entry.media.every(isPhotoMediaPendingHydration);
  }

  return false;
}
