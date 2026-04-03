import React from 'react';
import type { Entry } from '@/src/types/entry';
import { EntryEditor } from '@/src/components/EntryEditor';
import { TextEntryDetailPage } from '@/src/components/TextEntryDetailPage';

interface TimelineDialogsProps {
  viewingEntry: Entry | null;
  editingEntry: Entry | null;
  onCloseViewing: () => void;
  onDetailEdit: (entry: Entry) => void;
  onSaveEdit: (id: string, content: string, tags: string[]) => void;
  onCloseEditing: () => void;
}

export function TimelineDialogs({
  viewingEntry,
  editingEntry,
  onCloseViewing,
  onDetailEdit,
  onSaveEdit,
  onCloseEditing,
}: TimelineDialogsProps) {
  return (
    <>
      <TextEntryDetailPage
        visible={viewingEntry !== null}
        entry={viewingEntry}
        onClose={onCloseViewing}
        onEdit={onDetailEdit}
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
