import React from 'react';
import type { Entry } from '@/src/types/entry';
import { PhotoService } from '@/src/services/photoService';
import { logger } from '@/src/utils/logger';
import { EntryActionSheet } from '@/src/components/EntryActionSheet';
import { ImageViewer } from '@/src/components/ImageViewer';
import { isPhotoMediaPendingHydration } from '@/src/utils/mediaAvailability';

interface EntryCardDialogsProps {
  entry: Entry;
  selectedImageIndex: number;
  showImageViewer: boolean;
  showActionSheet: boolean;
  onCloseImageViewer: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCloseActionSheet: () => void;
}

export function EntryCardDialogs({
  entry,
  selectedImageIndex,
  showImageViewer,
  showActionSheet,
  onCloseImageViewer,
  onEdit,
  onDelete,
  onCloseActionSheet,
}: EntryCardDialogsProps) {
  const selectedMedia = entry.media?.[selectedImageIndex] ?? entry.media?.[0];
  const preferredViewerUri = selectedMedia
    ? PhotoService.getPreferredPhotoUri(selectedMedia, 'full')
    : '';
  const canOpenViewer = !!selectedMedia && !isPhotoMediaPendingHydration(selectedMedia);

  React.useEffect(() => {
    if (!showImageViewer || entry.type !== 'photo' || !preferredViewerUri || !canOpenViewer) {
      return;
    }

    logger.log('[EntryCardDialogs] opening image viewer', {
      entryId: entry.id,
      selectedImageIndex,
      selectedMedia: selectedMedia
        ? {
            uri: selectedMedia.uri,
            remoteUri: selectedMedia.remoteUri,
            thumbnail: selectedMedia.thumbnail,
            remoteThumbnail: selectedMedia.remoteThumbnail,
          }
        : null,
      preferredViewerUri,
    });
  }, [canOpenViewer, entry.id, entry.type, preferredViewerUri, selectedImageIndex, selectedMedia, showImageViewer]);

  return (
    <>
      {entry.type === 'photo' && preferredViewerUri && canOpenViewer ? (
        <ImageViewer
          visible={showImageViewer}
          imageUri={preferredViewerUri}
          onClose={onCloseImageViewer}
        />
      ) : null}

      <EntryActionSheet
        visible={showActionSheet}
        entryType={entry.type}
        onEdit={onEdit}
        onDelete={onDelete}
        onClose={onCloseActionSheet}
      />
    </>
  );
}
