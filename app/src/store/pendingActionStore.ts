import { create } from 'zustand';

interface PendingActionState {
  openTextEditor: boolean;
  triggerOpenTextEditor: () => void;
  clearOpenTextEditor: () => void;
}

export const usePendingActionStore = create<PendingActionState>((set) => ({
  openTextEditor: false,
  triggerOpenTextEditor: () => set({ openTextEditor: true }),
  clearOpenTextEditor: () => set({ openTextEditor: false }),
}));
