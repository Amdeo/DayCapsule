import { useMemo } from 'react';
import { Entry } from '@/src/types/entry';
import { formatEntryDateTime } from './textEntryDetailHelpers';

interface UseTextEntryDetailPageControllerOptions {
  entry: Entry | null;
  onEdit: (entry: Entry) => void;
}

export function useTextEntryDetailPageController({
  entry,
  onEdit,
}: UseTextEntryDetailPageControllerOptions) {
  return useMemo(() => {
    if (!entry) {
      return null;
    }

    return {
      content: entry.content,
      createdAt: formatEntryDateTime(entry.timestamp),
      editedAt: entry.editedAt ? formatEntryDateTime(entry.editedAt) : null,
      tags: entry.tags ?? [],
      handleEdit: () => onEdit(entry),
    };
  }, [entry, onEdit]);
}
