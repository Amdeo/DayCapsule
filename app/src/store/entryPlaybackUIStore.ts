import { create } from 'zustand';

interface EntryPlaybackUIStore {
  currentPlayingId: string | null;
  setCurrentPlayingId: (id: string | null) => void;
}

export const useEntryPlaybackUIStore = create<EntryPlaybackUIStore>((set) => ({
  currentPlayingId: null,
  setCurrentPlayingId: (id) => set({ currentPlayingId: id }),
}));
