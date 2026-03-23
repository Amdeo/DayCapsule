import type { MediaInfo } from '@/src/types/entry';
import { formatMMSS } from '@/src/utils/timeUtils';

export const formatEntryCardDuration = (seconds: number) => formatMMSS(seconds);

export function getEntryMediaDurationSeconds(media: MediaInfo | undefined): number {
  if (!media?.duration) {
    return 0;
  }

  return Math.floor(media.duration / 1000);
}
