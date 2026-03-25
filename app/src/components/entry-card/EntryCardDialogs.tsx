import React from 'react';
import type { Entry } from '@/src/types/entry';
import { PhotoService } from '@/src/services/photoService';
import { EntryActionSheet } from '../EntryActionSheet';
import { ImageViewer } from '../ImageViewer';

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

  return (
    <>
      {entry.type === 'photo' && preferredViewerUri ? (
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
