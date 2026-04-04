import React from 'react';
import type { Entry } from '@/src/types/entry';
import { EntryEditor } from '@/src/components/EntryEditor';
import { TextEntryDetailPage } from '@/src/components/TextEntryDetailPage';

interface TimelineDialogsProps {
  viewingEntry: Entry | null;
  editingEntry: Entry | null;
  onCloseViewing: () => void;
  onSaveTextDetail: (id: string, content: string, tags: string[]) => void | Promise<void>;
  onSaveEdit: (id: string, content: string, tags: string[]) => void;
  onCloseEditing: () => void;
}

export function TimelineDialogs({
  viewingEntry,
  editingEntry,
  onCloseViewing,
  onSaveTextDetail,
  onSaveEdit,
  onCloseEditing,
}: TimelineDialogsProps) {
  return (
    <>
      <TextEntryDetailPage
        visible={viewingEntry !== null}
        entry={viewingEntry}
        onClose={onCloseViewing}
        onSave={onSaveTextDetail}
      />

      <EntryEditor
        visible={editingEntry !== null}
        entry={editingEntry}
        onSave={onSaveEdit}
        onClose={onCloseEditing}
      />
    </>
  );
}
