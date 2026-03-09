import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import type { HistoryEntry } from '@/types/history';

interface HistoryStore {
  entries: HistoryEntry[];
  loaded: boolean;

  load: () => Promise<void>;
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => Promise<HistoryEntry>;
  deleteEntry: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  entries: [],
  loaded: false,

  load: async () => {
    const entries = await db.history.orderBy('createdAt').reverse().toArray();
    set({ entries, loaded: true });
  },

  addEntry: async (data) => {
    const entry: HistoryEntry = {
      ...data,
      id: nanoid(),
      createdAt: new Date(),
    };
    await db.history.add(entry);
    set((state) => ({ entries: [entry, ...state.entries] }));
    return entry;
  },

  deleteEntry: async (id) => {
    await db.history.delete(id);
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
  },

  clearAll: async () => {
    await db.history.clear();
    set({ entries: [] });
  },
}));
