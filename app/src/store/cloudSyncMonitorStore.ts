import { create } from 'zustand';

export type SyncMonitorPhase =
  | 'prepare'
  | 'sync-entries'
  | 'upload-media'
  | 'validate-media'
  | 'done';

export type SyncMonitorQueueItem = {
  id: string;
  kind: 'entry' | 'photo' | 'voice';
  title: string;
  status: 'pending' | 'running' | 'failed' | 'completed';
  detail?: string;
};

export type ActiveSyncRun = {
  runId: string;
  startedAt: number;
  phase: SyncMonitorPhase;
  phaseIndex: 1 | 2 | 3 | 4;
  entryProgress: {
    completed: number;
    total: number;
    currentItemTitle: string | null;
  };
  mediaProgress: {
    completed: number;
    total: number;
    currentItemTitle: string | null;
  };
  queue: SyncMonitorQueueItem[];
};

export type SyncRunResultStatus = 'success' | 'partial' | 'failed';

export type LastSyncRunSummary = {
  runId: string;
  status: SyncRunResultStatus;
  startedAt: number;
  finishedAt: number;
  failedPhase: SyncMonitorPhase | null;
  entryProcessed: number;
  mediaProcessed: number;
  failedItems: Array<{
    id: string;
    title: string;
    detail?: string;
  }>;
};

interface CloudSyncMonitorState {
  activeRun: ActiveSyncRun | null;
  lastRunSummary: LastSyncRunSummary | null;
  isVisible: boolean;

  show: () => void;
  hide: () => void;

  startRun: (runId: string) => void;
  setPhase: (phase: SyncMonitorPhase, phaseIndex: 1 | 2 | 3 | 4) => void;
  updateEntryProgress: (completed: number, total: number, currentItemTitle: string | null) => void;
  updateMediaProgress: (completed: number, total: number, currentItemTitle: string | null) => void;

  addQueueItem: (item: SyncMonitorQueueItem) => void;
  updateQueueItem: (id: string, patch: Partial<Pick<SyncMonitorQueueItem, 'status' | 'detail'>>) => void;

  finishRun: (result: {
    status: SyncRunResultStatus;
    failedPhase: SyncMonitorPhase | null;
    failedItems: LastSyncRunSummary['failedItems'];
  }) => void;
}

export const useCloudSyncMonitorStore = create<CloudSyncMonitorState>((set, get) => ({
  activeRun: null,
  lastRunSummary: null,
  isVisible: false,

  show: () => {
    set({ isVisible: true });
  },

  hide: () => {
    set({ isVisible: false });
  },

  startRun: (runId) => {
    set({
      activeRun: {
        runId,
        startedAt: Date.now(),
        phase: 'prepare',
        phaseIndex: 1,
        entryProgress: {
          completed: 0,
          total: 0,
          currentItemTitle: null,
        },
        mediaProgress: {
          completed: 0,
          total: 0,
          currentItemTitle: null,
        },
        queue: [],
      },
    });
  },

  setPhase: (phase, phaseIndex) => {
    const { activeRun } = get();
    if (!activeRun) {
      return;
    }

    set({
      activeRun: {
        ...activeRun,
        phase,
        phaseIndex,
      },
    });
  },

  updateEntryProgress: (completed, total, currentItemTitle) => {
    const { activeRun } = get();
    if (!activeRun) {
      return;
    }

    set({
      activeRun: {
        ...activeRun,
        entryProgress: {
          completed,
          total,
          currentItemTitle,
        },
      },
    });
  },

  updateMediaProgress: (completed, total, currentItemTitle) => {
    const { activeRun } = get();
    if (!activeRun) {
      return;
    }

    set({
      activeRun: {
        ...activeRun,
        mediaProgress: {
          completed,
          total,
          currentItemTitle,
        },
      },
    });
  },

  addQueueItem: (item) => {
    const { activeRun } = get();
    if (!activeRun) {
      return;
    }

    set({
      activeRun: {
        ...activeRun,
        queue: [...activeRun.queue, item],
      },
    });
  },

  updateQueueItem: (id, patch) => {
    const { activeRun } = get();
    if (!activeRun) {
      return;
    }

    set({
      activeRun: {
        ...activeRun,
        queue: activeRun.queue.map((item) => (
          item.id === id
            ? { ...item, ...patch }
            : item
        )),
      },
    });
  },

  finishRun: (result) => {
    const { activeRun } = get();
    if (!activeRun) {
      return;
    }

    set({
      activeRun: null,
      lastRunSummary: {
        runId: activeRun.runId,
        status: result.status,
        startedAt: activeRun.startedAt,
        finishedAt: Date.now(),
        failedPhase: result.failedPhase,
        entryProcessed: activeRun.entryProgress.completed,
        mediaProcessed: activeRun.mediaProgress.completed,
        failedItems: result.failedItems,
      },
    });
  },
}));
