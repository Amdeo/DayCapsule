import { create } from 'zustand';
import {
  getCurrentDataScopeKey,
  getCurrentDataScopeKeySync,
} from '@/src/services/workspaceService';

export const LOCAL_SCOPE_KEY = 'local';

interface WorkspaceSessionStoreState {
  currentScopeKey: string;
  isTransitioning: boolean;
  setCurrentScopeKey: (scopeKey: string) => void;
  refreshCurrentScopeKey: () => Promise<string>;
  setSessionTransitioning: (isTransitioning: boolean) => void;
  resetForTest: () => void;
}

export interface WorkspaceSessionSnapshot {
  currentScopeKey: string;
  isTransitioning: boolean;
  isAccountScopeActive: boolean;
  canRunCloudSync: boolean;
}

export const useWorkspaceSessionStore = create<WorkspaceSessionStoreState>((set) => ({
  currentScopeKey: getCurrentDataScopeKeySync(),
  isTransitioning: false,
  setCurrentScopeKey: (currentScopeKey) => set({ currentScopeKey }),
  refreshCurrentScopeKey: async () => {
    const currentScopeKey = await getCurrentDataScopeKey();
    set({ currentScopeKey });
    return currentScopeKey;
  },
  setSessionTransitioning: (isTransitioning) => set({ isTransitioning }),
  resetForTest: () => set({ currentScopeKey: LOCAL_SCOPE_KEY, isTransitioning: false }),
}));

export function buildWorkspaceSessionSnapshot(
  isAuthenticated: boolean,
  currentScopeKey = useWorkspaceSessionStore.getState().currentScopeKey,
  isTransitioning = useWorkspaceSessionStore.getState().isTransitioning
): WorkspaceSessionSnapshot {
  const isAccountScopeActive = isAuthenticated && currentScopeKey !== LOCAL_SCOPE_KEY;

  return {
    currentScopeKey,
    isTransitioning,
    isAccountScopeActive,
    canRunCloudSync: isAccountScopeActive && !isTransitioning,
  };
}

export function isAccountScopeActive(
  isAuthenticated: boolean,
  currentScopeKey = useWorkspaceSessionStore.getState().currentScopeKey
): boolean {
  return buildWorkspaceSessionSnapshot(isAuthenticated, currentScopeKey).isAccountScopeActive;
}

export function canRunCloudSync(
  isAuthenticated: boolean,
  currentScopeKey = useWorkspaceSessionStore.getState().currentScopeKey,
  isTransitioning = useWorkspaceSessionStore.getState().isTransitioning
): boolean {
  return buildWorkspaceSessionSnapshot(
    isAuthenticated,
    currentScopeKey,
    isTransitioning
  ).canRunCloudSync;
}
