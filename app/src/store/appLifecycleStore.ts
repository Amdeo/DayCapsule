import { create } from 'zustand';

interface AppLifecycleState {
  needsRestart: boolean;
  triggerRestart: () => void;
  clearRestart: () => void;
}

export const useAppLifecycleStore = create<AppLifecycleState>((set) => ({
  needsRestart: false,
  triggerRestart: () => set({ needsRestart: true }),
  clearRestart: () => set({ needsRestart: false }),
}));
