import { useCallback, useState } from 'react';
import type { Entry } from '@/src/types/entry';

export function useTimelineEntryDetailState() {
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const handleViewEntry = useCallback((entry: Entry) => {
    if (entry.type !== 'text') return;
    setViewingEntry(entry);
  }, []);

  const handleEditEntry = useCallback((entry: Entry) => {
    setEditingEntry(entry);
  }, []);

  const closeViewingEntry = useCallback(() => {
    setViewingEntry(null);
  }, []);

  const closeEditingEntry = useCallback(() => {
    setEditingEntry(null);
  }, []);

  return {
    viewingEntry,
    editingEntry,
    handleViewEntry,
    handleEditEntry,
    closeViewingEntry,
    closeEditingEntry,
  };
}
