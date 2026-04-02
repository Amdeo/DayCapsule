/**
 * Entry Store - 游标分页 + Zustand
 * 内存只保留当前已加载页，写操作直接更新内存无需重新全量加载
 */

import { create } from 'zustand';
import { Entry } from '@/src/types/entry';
import { localDataSource } from '@/src/database/dataSource';
import type { EntryFilters } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import * as DB from '@/src/database/operations';
import { deleteFile } from '@/src/utils/fileSystem';
import { cancelVoiceUpload } from '@/src/services/voiceUploadQueue';
import { cancelPhotoUpload } from '@/src/services/photoUploadQueue';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { useEntryFilterUIStore, type EntryFilterState } from '@/src/store/entryFilterUIStore';

const PAGE_SIZE = 20;
const MAX_LOAD_RETRIES = 5;

/** 从当前过滤状态构建 DB 查询参数 */
const buildFilters = (state: EntryFilterState): EntryFilters => {
  const filters: EntryFilters = {};
  if (state.filterType !== 'all') {
    filters.type = state.filterType as EntryFilters['type'];
  }
  if (state.filterDateRange !== 'all') {
    const now = Date.now();
    const ranges: Record<string, number> = {
      today: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
    };
    filters.startTime = now - (ranges[state.filterDateRange] ?? 0);
  }
  if (state.searchQuery.trim()) {
    filters.search = state.searchQuery;
  }
  if (state.selectedTags.length) {
    filters.tags = state.selectedTags;
  }
  return filters;
};

const buildQueryKey = (state: EntryFilterState) =>
  JSON.stringify({
    query: state.searchQuery,
    type: state.filterType,
    dateRange: state.filterDateRange,
    tags: [...state.selectedTags].sort((a, b) => a.localeCompare(b)),
  });

const mergeUniqueById = (prev: Entry[], next: Entry[]): Entry[] => {
  const seen = new Set(prev.map((entry) => entry.id));
  const uniqueNext = next.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  return [...prev, ...uniqueNext];
};

const shouldUseCloudPendingState = (): boolean =>
  useSettingsStore.getState().cloudMode === true;

const buildPendingInsertEntry = (entry: Omit<Entry, 'id' | 'timestamp'>): Omit<Entry, 'id' | 'timestamp'> => {
  if (!shouldUseCloudPendingState()) {
    return {
      ...entry,
      syncStatus: 'synced',
      syncOp: entry.syncOp ?? 'update',
    };
  }

  return {
    ...entry,
    syncStatus: entry.syncStatus === 'pending_upload' || entry.syncStatus === 'uploading' || entry.syncStatus === 'pending_delete'
      ? entry.syncStatus
      : 'pending',
    syncOp: entry.syncOp ?? 'create',
    updatedAt: entry.updatedAt ?? Date.now(),
    baseUpdatedAt: entry.baseUpdatedAt ?? entry.updatedAt,
  };
};

const buildPendingUpdate = (updates: Partial<Entry>): Partial<Entry> => {
  if (!shouldUseCloudPendingState()) {
    return {
      ...updates,
      syncStatus: updates.syncStatus ? 'synced' : updates.syncStatus,
      syncOp: updates.syncOp ?? 'update',
    };
  }

  if (updates.syncStatus === 'pending_upload' || updates.syncStatus === 'uploading' || updates.syncStatus === 'pending_delete') {
    return {
      ...updates,
      updatedAt: updates.updatedAt ?? Date.now(),
      baseUpdatedAt: updates.baseUpdatedAt ?? updates.updatedAt,
    };
  }

  return {
    ...updates,
    syncStatus: updates.syncStatus ?? 'pending',
    syncOp: updates.syncOp ?? 'update',
    updatedAt: updates.updatedAt ?? Date.now(),
    baseUpdatedAt: updates.baseUpdatedAt ?? updates.updatedAt,
  };
};

const removeBrokenRecordingEntries = async (page: Entry[]): Promise<Entry[]> => {
  const cleaned: Entry[] = [];

  for (const entry of page) {
    if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'paused') {
      try {
        await localDataSource.deleteEntry(entry.id);
        logger.log('🧹 清理无效录音:', entry.id);
        continue;
      } catch {
        // 如果删除失败，保留原 entry，避免静默丢数据
      }
    }

    cleaned.push(entry);
  }

  return cleaned;
};

const getLocalMediaFileUris = (entry?: Entry): string[] =>
  Array.from(
    new Set(
      (entry?.media ?? []).flatMap((media) =>
        [media.uri, media.thumbnail].filter((uri): uri is string => Boolean(uri))
      )
    )
  );

const deleteLocalMediaFiles = async (entry?: Entry): Promise<void> => {
  for (const uri of getLocalMediaFileUris(entry)) {
    await deleteFile(uri).catch(() => {});
  }
};

const refreshCloudSyncIndicator = (): void => {
  void useCloudSyncIndicatorStore.getState().refresh().catch((error) => {
    logger.warn('[entryStore] Failed to refresh cloud sync indicator:', error);
  });
};

interface EntryStore {
  // 数据
  entries: Entry[];
  activeQueryKey: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  cursor: number | null;    // 最后一条的 timestamp，用于下一页查询
  hasMore: boolean;

  // 重试计数
  loadRetryCount: number;

  // 数据加载
  loadEntries: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshEntries: () => Promise<void>;

  // CRUD
  addEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<void>;
  addLocalEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<Entry>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  updateLocalEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  replaceEntry: (oldId: string, entry: Entry) => void;
  deleteEntry: (id: string) => Promise<void>;

  // 查询
  getRecentEntries: (limit?: number) => Entry[];
  searchEntries: (query: string) => Promise<void>;
  getAllTags: () => Promise<string[]>;

  // 录音
  updateRecordingStatus: (id: string, status: 'recording' | 'paused' | 'completed') => Promise<void>;
  updateRecordingDuration: (id: string, duration: number) => void;
  completeRecording: (id: string, uri: string, duration: number) => Promise<void>;

  applyFilters: () => Promise<void>;
  applySearchFilters: (filters: {
    query?: string;
    type?: 'all' | 'text' | 'photo' | 'voice';
    dateRange?: 'all' | 'today' | 'week' | 'month';
    tags?: string[];
  }) => Promise<void>;
  restoreEntries: (entries: Entry[]) => Promise<string[]>;
}

export const useEntryStore = create<EntryStore>((set, get) => {
  const executeFirstPageQuery = async (
    queryKey: string,
    retryCount: number,
    options: { allowRetry: boolean; logLabel: string }
  ): Promise<void> => {
    try {
      const filters = buildFilters(useEntryFilterUIStore.getState());
      const page = await localDataSource.getEntriesPage(filters, PAGE_SIZE);
      const pendingVoiceEntries = await DB.getVoiceEntriesBySyncStatus(['pending_upload', 'uploading']);
      const pendingPhotoEntries = await DB.getPhotoEntriesBySyncStatus(['pending_upload', 'uploading']);
      const mergedPending = mergeUniqueById(pendingVoiceEntries, pendingPhotoEntries);
      const merged = mergeUniqueById(mergedPending, page).sort((a, b) => b.timestamp - a.timestamp);
      const cleaned = await removeBrokenRecordingEntries(merged);

      if (get().activeQueryKey !== queryKey) {
        logger.debug('[entryStore] Ignore stale first-page result:', queryKey);
        return;
      }

      set((state) => ({
        entries: cleaned,
        cursor: cleaned.at(-1)?.timestamp ?? null,
        hasMore: page.length === PAGE_SIZE,
        isLoading: false,
        isLoadingMore: false,
        loadRetryCount: retryCount > 0 ? 0 : state.loadRetryCount,
      }));
      logger.log('✅ 加载了', cleaned.length, '条记录');
    } catch (error: any) {
      logger.error(`Failed to ${options.logLabel}:`, error);

      if (
        options.allowRetry &&
        error?.message?.includes('no such table') &&
        retryCount < MAX_LOAD_RETRIES
      ) {
        const nextRetry = retryCount + 1;
        set({ loadRetryCount: nextRetry });
        logger.log(`⏳ 数据库表尚未创建，${nextRetry}/${MAX_LOAD_RETRIES} 秒后重试...`);

        setTimeout(() => {
          if (get().activeQueryKey !== queryKey) return;
          void executeFirstPageQuery(queryKey, nextRetry, options);
        }, 500);
        return;
      }

      if (get().activeQueryKey === queryKey) {
        set((state) => ({
          isLoading: false,
          isLoadingMore: false,
          loadRetryCount: options.allowRetry ? 0 : state.loadRetryCount,
        }));
      }
    }
  };

  return ({
  entries: [],
  activeQueryKey: '',
  isLoading: false,
  isLoadingMore: false,
  cursor: null,
  hasMore: true,
  loadRetryCount: 0,

  /**
   * 首次加载（重置游标，加载第一页）
   */
  loadEntries: async () => {
    const state = get();
    const queryKey = buildQueryKey(useEntryFilterUIStore.getState());
    set({
      activeQueryKey: queryKey,
      isLoading: true,
      isLoadingMore: false,
      cursor: null,
      hasMore: true,
    });
    await executeFirstPageQuery(queryKey, state.loadRetryCount, {
      allowRetry: true,
      logLabel: 'load entries',
    });
  },

  /**
   * 加载下一页（追加到 entries 末尾）
   */
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
        return {
          entries: next,
          cursor: page.at(-1)?.timestamp ?? s.cursor,
          hasMore: page.length === PAGE_SIZE,
          isLoadingMore: false,
        };
      });
    } catch (error) {
      logger.error('Failed to load more entries:', error);
      if (get().activeQueryKey === activeQueryKey) {
        set({ isLoadingMore: false });
      }
    }
  },

  refreshEntries: async () => get().loadEntries(),

  /**
   * 添加记录：写 DB 后 prepend 到内存头部，无需重新加载
   */
  addEntry: async (entry) => {
    try {
      const nextEntry = buildPendingInsertEntry(entry);
      const newEntry = await DB.addEntry(nextEntry);
      set((s) => ({
        entries: [newEntry, ...s.entries],
      }));
      refreshCloudSyncIndicator();
      logger.log('✅ 添加记录:', newEntry.id);
    } catch (error) {
      logger.error('Failed to add entry:', error);
      throw error;
    }
  },

  addLocalEntry: async (entry) => {
    try {
      const nextEntry = buildPendingInsertEntry(entry);
      const newEntry = await DB.addEntry(nextEntry);
      set((s) => ({
        entries: [newEntry, ...s.entries.filter((e) => e.id !== newEntry.id)],
      }));
      refreshCloudSyncIndicator();
      logger.log('✅ 本地添加记录:', newEntry.id);
      return newEntry;
    } catch (error) {
      logger.error('Failed to add local entry:', error);
      throw error;
    }
  },

  /**
   * 更新记录：写 DB 后 map 更新内存
   */
  updateEntry: async (id, updates) => {
    try {
      const nextUpdates = buildPendingUpdate(updates);
      await DB.updateEntry(id, nextUpdates);
      const patch = (arr: Entry[]) =>
        arr.map((e) => (e.id === id ? { ...e, ...nextUpdates } : e));
      set((s) => ({ entries: patch(s.entries) }));
      refreshCloudSyncIndicator();
      logger.log('✅ 更新记录:', id);
    } catch (error) {
      logger.error('Failed to update entry:', error);
      throw error;
    }
  },

  updateLocalEntry: async (id, updates) => {
    try {
      const nextUpdates = buildPendingUpdate(updates);
      await DB.updateEntry(id, nextUpdates);
      const patch = (arr: Entry[]) =>
        arr.map((e) => (e.id === id ? { ...e, ...nextUpdates } : e));
      set((s) => ({ entries: patch(s.entries) }));
      refreshCloudSyncIndicator();
      logger.log('✅ 本地更新记录:', id);
    } catch (error) {
      logger.error('Failed to update local entry:', error);
      throw error;
    }
  },

  replaceEntry: (oldId, entry) => {
    set((s) => ({
      entries: s.entries
        .map((existing) => (existing.id === oldId ? entry : existing))
        .filter((existing, index, arr) => arr.findIndex((candidate) => candidate.id === existing.id) === index),
    }));
    refreshCloudSyncIndicator();
  },

  /**
   * 删除记录：写 DB 后从内存移除
   */
  deleteEntry: async (id) => {
    try {
      const existingEntry = get().entries.find((entry) => entry.id === id);
      const shouldDeleteLocallyOnly =
        (existingEntry?.type === 'voice' || existingEntry?.type === 'photo') &&
        (existingEntry.syncStatus === 'pending_upload' || existingEntry.syncStatus === 'uploading');
      const shouldSoftDeleteForCloud =
        shouldUseCloudPendingState() &&
        !!existingEntry &&
        !shouldDeleteLocallyOnly &&
        existingEntry.syncStatus === 'synced';

      if (shouldDeleteLocallyOnly) {
        if (existingEntry?.type === 'voice') {
          cancelVoiceUpload(id);
        } else if (existingEntry?.type === 'photo') {
          cancelPhotoUpload(id);
        }

        await deleteLocalMediaFiles(existingEntry);
        await DB.deleteEntry(id);
      } else if (shouldSoftDeleteForCloud) {
        await DB.markEntryPendingDelete(id);
      } else {
        await localDataSource.deleteEntry(id);
      }

      const remove = (arr: Entry[]) => arr.filter((e) => e.id !== id);
      set((s) => ({ entries: remove(s.entries) }));
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
    const patch = (arr: Entry[]) =>
      arr.map((e) => (e.id === id ? { ...e, recordingDuration: duration } : e));
    set((s) => ({ entries: patch(s.entries) }));
  },

  completeRecording: async (id, uri, duration) =>
    get().updateEntry(id, {
      recordingStatus: 'completed',
      recordingDuration: Math.floor(duration / 1000),
      media: [{ uri, mimeType: 'audio/m4a', size: 0, duration }],
    }),

  /**
   * 批量应用搜索筛选条件，只触发一次数据库查询
   */
  applySearchFilters: async (filters) => {
    useEntryFilterUIStore.getState().applySearchFilters(filters);
    await get().applyFilters();
  },

  /**
   * 批量恢复备份记录，完成后重新加载第一页
   */
  restoreEntries: async (entries: Entry[]): Promise<string[]> => {
    const insertedIds = await localDataSource.restoreEntries(entries);
    try {
      await get().loadEntries();
    } catch (error) {
      logger.warn('[entryStore] restoreEntries refresh failed after restore succeeded:', error);
    }
    refreshCloudSyncIndicator();
    return insertedIds;
  },

  /**
   * 过滤条件变更：重置游标，重新加载第一页
   */
  applyFilters: async () => {
    const state = get();
    const queryKey = buildQueryKey(useEntryFilterUIStore.getState());
    set({
      activeQueryKey: queryKey,
      isLoading: true,
      isLoadingMore: false,
      cursor: null,
      hasMore: true,
    });

    await executeFirstPageQuery(queryKey, state.loadRetryCount, {
      allowRetry: false,
      logLabel: 'apply filters',
    });
  },
  });
});

export type { Entry };
