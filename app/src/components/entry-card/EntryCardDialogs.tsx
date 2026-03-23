import React from 'react';
import type { Entry } from '@/src/types/entry';
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
  return (
    <>
      {entry.type === 'photo' && entry.media?.[0]?.uri ? (
        <ImageViewer
          visible={showImageViewer}
          imageUri={entry.media[selectedImageIndex]?.uri ?? entry.media[0].uri}
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
