import { create } from 'zustand';

import type { MediaRepairIssue } from '@/src/services/cloudMediaSyncService';

interface MediaRepairStoreState {
  issues: MediaRepairIssue[];
  replaceIssues: (issues: MediaRepairIssue[]) => void;
  clearIssues: () => void;
  dismissIssue: (entryId: string, localMediaId?: string) => void;
}

export const useMediaRepairStore = create<MediaRepairStoreState>((set) => ({
  issues: [],

  replaceIssues: (issues) => {
    set({ issues: [...issues] });
  },

  clearIssues: () => {
    set({ issues: [] });
  },

  dismissIssue: (entryId, localMediaId) => {
    set((state) => ({
      issues: state.issues.filter((issue) => {
        if (issue.entryId !== entryId) {
          return true;
        }

        if (localMediaId === undefined) {
          return issue.localMediaId !== undefined;
        }

        return issue.localMediaId !== localMediaId;
      }),
    }));
  },
}));
