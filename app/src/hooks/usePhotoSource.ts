import { useEffect, useState } from 'react';
import type { MediaInfo } from '@/src/types/entry';
import { PhotoService } from '@/src/services/photoService';
import { isPhotoMediaPendingHydration } from '@/src/utils/mediaAvailability';

export function usePhotoSource(
  photo: MediaInfo,
  kind: 'thumbnail' | 'full' = 'thumbnail'
) {
  const [sourceUri, setSourceUri] = useState(() =>
    PhotoService.getPreferredPhotoUri(photo, kind)
  );
  const [missing, setMissing] = useState(() => sourceUri.length === 0);
  const pendingHydration = isPhotoMediaPendingHydration(photo);

  useEffect(() => {
    const nextSourceUri = PhotoService.getPreferredPhotoUri(photo, kind);
    setSourceUri(nextSourceUri);
    setMissing(nextSourceUri.length === 0);
  }, [kind, photo.remoteThumbnail, photo.remoteUri, photo.thumbnail, photo.uri]);

  const handleError = () => {
    const fallbackUri = PhotoService.getFallbackPhotoUri(photo, sourceUri, kind);
    if (fallbackUri && fallbackUri !== sourceUri) {
      setSourceUri(fallbackUri);
      return;
    }
    setMissing(true);
  };

  return {
    sourceUri,
    missing,
    pendingHydration,
    handleError,
  };
}
