import type { Entry } from '@/src/types/entry';

export interface EntryStore {
  // 数据
  entries: Entry[];
  activeQueryKey: string;
  activeLoadSessionId: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  cursor: number | null; // 最后一条的 timestamp，用于下一页查询
  hasMore: boolean;

  // 重试计数
  loadRetryCount: number;

  // 数据加载
  invalidateActiveQueries: () => void;
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
