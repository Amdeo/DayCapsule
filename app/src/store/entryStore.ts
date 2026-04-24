/**
 * Entry Store - 游标分页 + Zustand
 * 内存只保留当前已加载页，写操作直接更新内存无需重新全量加载
 */

import { create } from 'zustand';
import type { Entry } from '@/src/types/entry';
import { localDataSource } from '@/src/database/dataSource';
import { logger } from '@/src/utils/logger';
import * as DB from '@/src/database/operations';
import { cancelVoiceUpload } from '@/src/services/voiceUploadQueue';
import { cancelPhotoUpload } from '@/src/services/photoUploadQueue';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { useEntryFilterUIStore } from '@/src/store/entryFilterUIStore';
import { useAuthStore } from '@/src/store/authStore';
import { buildFilters, buildQueryKey, mergeUniqueById } from './__internal__/entryStoreUtils';
import { buildPendingInsertEntry, buildPendingUpdate } from './__internal__/entrySyncMapper';
import { deleteLocalMediaFiles } from './__internal__/entryMediaCleanup';
import { executeFirstPageQuery, PAGE_SIZE } from './__internal__/entryFirstPageQuery';
import type { EntryStore } from './__internal__/entryStoreTypes';
import { canRunCloudSync } from '@/src/services/workspaceSessionState';

const refreshCloudSyncIndicator = (): void => {
  void useCloudSyncIndicatorStore.getState().refresh().catch((error) => {
    logger.warn('[entryStore] Failed to refresh cloud sync indicator:', error);
  });
};

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],
  activeQueryKey: '',
  activeLoadSessionId: 0,
  isLoading: false,
  isLoadingMore: false,
  cursor: null,
  hasMore: true,
  loadRetryCount: 0,

  invalidateActiveQueries: () => {
    set((state) => ({
      activeQueryKey: `invalidated:${state.activeLoadSessionId + 1}`,
      activeLoadSessionId: state.activeLoadSessionId + 1,
      isLoading: false,
      isLoadingMore: false,
      loadRetryCount: 0,
    }));
  },

  /** 首次加载（重置游标，加载第一页） */
  loadEntries: async () => {
    const state = get();
    const queryKey = buildQueryKey(useEntryFilterUIStore.getState());
    const loadSessionId = state.activeLoadSessionId + 1;
    set({ activeQueryKey: queryKey, activeLoadSessionId: loadSessionId, isLoading: true, isLoadingMore: false, cursor: null, hasMore: true });
    await executeFirstPageQuery(queryKey, loadSessionId, state.loadRetryCount, { allowRetry: true, logLabel: 'load entries' }, { get, set });
  },

  /** 加载下一页（追加到 entries 末尾） */
  loadMore: async () => {
    const { cursor, isLoadingMore, hasMore, activeQueryKey } = get();
    if (isLoadingMore || !hasMore) return;

    set({ isLoadingMore: true });
    try {
      const filters = buildFilters(useEntryFilterUIStore.getState());
      const page = await localDataSource.getEntriesPage(filters, PAGE_SIZE, cursor ?? undefined);

      if (get().activeQueryKey !== activeQueryKey) {
        logger.debug('[entryStore] Ignore stale loadMore result:', activeQueryKey);
        return;
      }

      set((s) => {
        const next = mergeUniqueById(s.entries, page);
        return { entries: next, cursor: page.at(-1)?.timestamp ?? s.cursor, hasMore: page.length === PAGE_SIZE, isLoadingMore: false };
      });
    } catch (error) {
      logger.error('Failed to load more entries:', error);
      if (get().activeQueryKey === activeQueryKey) set({ isLoadingMore: false });
    }
  },

  refreshEntries: async () => get().loadEntries(),

  /** 添加记录：写 DB 后 prepend 到内存头部 */
  addEntry: async (entry) => {
    try {
      const nextEntry = buildPendingInsertEntry(
        entry,
        canRunCloudSync(useAuthStore.getState().isAuthenticated)
      );
      const newEntry = await DB.addEntry(nextEntry);
      set((s) => ({ entries: [newEntry, ...s.entries] }));
      refreshCloudSyncIndicator();
      logger.log('✅ 添加记录:', newEntry.id);
    } catch (error) {
      logger.error('Failed to add entry:', error);
      throw error;
    }
  },

  addLocalEntry: async (entry) => {
    try {
      const nextEntry = buildPendingInsertEntry(
        entry,
        canRunCloudSync(useAuthStore.getState().isAuthenticated)
      );
      const newEntry = await DB.addEntry(nextEntry);
      set((s) => ({ entries: [newEntry, ...s.entries.filter((e) => e.id !== newEntry.id)] }));
      refreshCloudSyncIndicator();
      logger.log('✅ 本地添加记录:', newEntry.id);
      return newEntry;
    } catch (error) {
      logger.error('Failed to add local entry:', error);
      throw error;
    }
  },

  /** 更新记录：写 DB 后 map 更新内存 */
  updateEntry: async (id, updates) => {
    try {
      const nextUpdates = buildPendingUpdate(
        updates,
        canRunCloudSync(useAuthStore.getState().isAuthenticated)
      );
      await DB.updateEntry(id, nextUpdates);
      set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...nextUpdates } : e)) }));
      refreshCloudSyncIndicator();
      logger.log('✅ 更新记录:', id);
    } catch (error) {
      logger.error('Failed to update entry:', error);
      throw error;
    }
  },

  /** updateLocalEntry 是 updateEntry 的别名，用于本地流程的语义清晰度 */
  updateLocalEntry: async (id, updates) => get().updateEntry(id, updates),

  replaceEntry: (oldId, entry) => {
    set((s) => ({
      entries: s.entries
        .map((existing) => (existing.id === oldId ? entry : existing))
        .filter((existing, index, arr) => arr.findIndex((c) => c.id === existing.id) === index),
    }));
    refreshCloudSyncIndicator();
  },

  /** 删除记录：写 DB 后从内存移除 */
  deleteEntry: async (id) => {
    try {
      const existingEntry = get().entries.find((entry) => entry.id === id);
      const shouldDeleteLocallyOnly =
        (existingEntry?.type === 'voice' || existingEntry?.type === 'photo') &&
        (existingEntry.syncStatus === 'pending_upload' || existingEntry.syncStatus === 'uploading');
      const shouldSoftDeleteForCloud =
        canRunCloudSync(useAuthStore.getState().isAuthenticated) &&
        !!existingEntry &&
        !shouldDeleteLocallyOnly &&
        existingEntry.syncStatus === 'synced';

      if (shouldDeleteLocallyOnly) {
        if (existingEntry?.type === 'voice') cancelVoiceUpload(id);
        else if (existingEntry?.type === 'photo') cancelPhotoUpload(id);
        await deleteLocalMediaFiles(existingEntry);
        await DB.deleteEntry(id);
      } else if (shouldSoftDeleteForCloud) {
        await DB.markEntryPendingDelete(id);
      } else {
        await localDataSource.deleteEntry(id);
      }

      set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      refreshCloudSyncIndicator();
      logger.log('✅ 删除记录:', id);
    } catch (error) {
      logger.error('Failed to delete entry:', error);
      throw error;
    }
  },

  getRecentEntries: (limit = 10) =>
    [...get().entries].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit),

  searchEntries: async (query) => {
    useEntryFilterUIStore.getState().setSearchQuery(query);
    await get().applyFilters();
  },

  getAllTags: () => localDataSource.getAllTags(),

  updateRecordingStatus: async (id, status) => get().updateEntry(id, { recordingStatus: status }),

  /** 仅内存更新，避免 100ms 高频 I/O */
  updateRecordingDuration: (id, duration) => {
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, recordingDuration: duration } : e)) }));
  },

  completeRecording: async (id, uri, duration) =>
    get().updateEntry(id, {
      recordingStatus: 'completed',
      recordingDuration: Math.floor(duration / 1000),
      media: [{ uri, mimeType: 'audio/m4a', size: 0, duration }],
    }),

  applySearchFilters: async (filters) => {
    useEntryFilterUIStore.getState().applySearchFilters(filters);
    await get().applyFilters();
  },

  /** 批量恢复备份记录，完成后重新加载第一页 */
  restoreEntries: async (entries: Entry[]) => {
    const insertedIds = await localDataSource.restoreEntries(entries);
    try {
      await get().loadEntries();
    } catch (error) {
      logger.warn('[entryStore] restoreEntries refresh failed after restore succeeded:', error);
    }
    refreshCloudSyncIndicator();
    return insertedIds;
  },

  /** 过滤条件变更：重置游标，重新加载第一页 */
  applyFilters: async () => {
    const state = get();
    const queryKey = buildQueryKey(useEntryFilterUIStore.getState());
    const loadSessionId = state.activeLoadSessionId + 1;
    set({ activeQueryKey: queryKey, activeLoadSessionId: loadSessionId, isLoading: true, isLoadingMore: false, cursor: null, hasMore: true });
    await executeFirstPageQuery(queryKey, loadSessionId, state.loadRetryCount, { allowRetry: false, logLabel: 'apply filters' }, { get, set });
  },
}));

export type { Entry };
