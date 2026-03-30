import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry } from '@/src/types/entry';

const DETAIL_PAGE_EXIT_DURATION_MS = 300;

export function useTimelineEntryDetailState() {
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const pendingEditingEntryRef = useRef<Entry | null>(null);
  const detailToEditorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (detailToEditorTimerRef.current) {
      clearTimeout(detailToEditorTimerRef.current);
      detailToEditorTimerRef.current = null;
    }
  }, []);

  const handleViewEntry = useCallback((entry: Entry) => {
    if (entry.type !== 'text') {
      return;
    }
    setViewingEntry(entry);
  }, []);

  const handleEditEntry = useCallback((entry: Entry) => {
    if (detailToEditorTimerRef.current) {
      clearTimeout(detailToEditorTimerRef.current);
      detailToEditorTimerRef.current = null;
    }
    pendingEditingEntryRef.current = null;
    setEditingEntry(entry);
  }, []);

  const closeViewingEntry = useCallback(() => {
    pendingEditingEntryRef.current = null;
    if (detailToEditorTimerRef.current) {
      clearTimeout(detailToEditorTimerRef.current);
      detailToEditorTimerRef.current = null;
    }
    setViewingEntry(null);
  }, []);

  const closeEditingEntry = useCallback(() => {
    pendingEditingEntryRef.current = null;
    if (detailToEditorTimerRef.current) {
      clearTimeout(detailToEditorTimerRef.current);
      detailToEditorTimerRef.current = null;
    }
    setEditingEntry(null);
  }, []);

  const handleDetailEdit = useCallback((entry: Entry) => {
    pendingEditingEntryRef.current = entry;
    setViewingEntry(null);
    if (detailToEditorTimerRef.current) {
      clearTimeout(detailToEditorTimerRef.current);
    }
    detailToEditorTimerRef.current = setTimeout(() => {
      setEditingEntry(pendingEditingEntryRef.current);
      pendingEditingEntryRef.current = null;
      detailToEditorTimerRef.current = null;
    }, DETAIL_PAGE_EXIT_DURATION_MS);
  }, []);

  return {
    viewingEntry,
    editingEntry,
    handleViewEntry,
    handleEditEntry,
    closeViewingEntry,
    closeEditingEntry,
    handleDetailEdit,
  };
}
