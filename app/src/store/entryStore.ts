import { create } from 'zustand';

export interface Entry {
  id: string;
  type: 'text' | 'photo' | 'voice';
  content: string;
  timestamp: number;
  tags?: string[];
}

interface EntryStore {
  entries: Entry[];
  addEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => void;
  deleteEntry: (id: string) => void;
  getRecentEntries: (limit?: number) => Entry[];
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],

  addEntry: (entry) => set((state) => ({
    entries: [
      ...state.entries,
      {
        ...entry,
        id: Date.now().toString(),
        timestamp: Date.now(),
      },
    ],
  })),

  deleteEntry: (id) => set((state) => ({
    entries: state.entries.filter((e) => e.id !== id),
  })),

  getRecentEntries: (limit = 10) => {
    const { entries } = get();
    return entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
}));
