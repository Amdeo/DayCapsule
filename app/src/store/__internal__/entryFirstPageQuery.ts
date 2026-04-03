/**
 * 首页第一页查询逻辑（含竞态保护和数据库就绪重试）
 */

import { localDataSource } from '@/src/database/dataSource';
import * as DB from '@/src/database/operations';
import { logger } from '@/src/utils/logger';
import { useEntryFilterUIStore } from '@/src/store/entryFilterUIStore';
import { buildFilters } from './entryStoreUtils';
import { mergeUniqueById } from './entryStoreUtils';
import { removeBrokenRecordingEntries } from './entryMediaCleanup';
import type { EntryStore } from './entryStoreTypes';

const PAGE_SIZE = 20;
const MAX_LOAD_RETRIES = 5;

type SetFn = (partial: Partial<EntryStore> | ((state: EntryStore) => Partial<EntryStore>)) => void;
type GetFn = () => EntryStore;

export async function executeFirstPageQuery(
  queryKey: string,
  loadSessionId: number,
  retryCount: number,
  options: { allowRetry: boolean; logLabel: string },
  deps: { get: GetFn; set: SetFn }
): Promise<void> {
  const { get, set } = deps;

  try {
    const filters = buildFilters(useEntryFilterUIStore.getState());
    const page = await localDataSource.getEntriesPage(filters, PAGE_SIZE);
    const pendingVoiceEntries = await DB.getVoiceEntriesBySyncStatus(['pending_upload', 'uploading']);
    const pendingPhotoEntries = await DB.getPhotoEntriesBySyncStatus(['pending_upload', 'uploading']);
    const mergedPending = mergeUniqueById(pendingVoiceEntries, pendingPhotoEntries);
    const merged = mergeUniqueById(mergedPending, page).sort((a, b) => b.timestamp - a.timestamp);
    const cleaned = await removeBrokenRecordingEntries(merged);

    if (get().activeQueryKey !== queryKey || get().activeLoadSessionId !== loadSessionId) {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to ${options.logLabel}:`, error);

    if (options.allowRetry && message.includes('no such table') && retryCount < MAX_LOAD_RETRIES) {
      const nextRetry = retryCount + 1;
      set({ loadRetryCount: nextRetry });
      logger.log(`⏳ 数据库表尚未创建，${nextRetry}/${MAX_LOAD_RETRIES} 秒后重试...`);

      setTimeout(() => {
        if (get().activeQueryKey !== queryKey || get().activeLoadSessionId !== loadSessionId) return;
        void executeFirstPageQuery(queryKey, loadSessionId, nextRetry, options, deps);
      }, 500);
      return;
    }

    if (get().activeQueryKey === queryKey && get().activeLoadSessionId === loadSessionId) {
      set((state) => ({
        isLoading: false,
        isLoadingMore: false,
        loadRetryCount: options.allowRetry ? 0 : state.loadRetryCount,
      }));
    }
  }
}

export { PAGE_SIZE };
