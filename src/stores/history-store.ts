import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import type { HistoryEntry } from '@/types/history';

interface HistoryStore {
  entries: HistoryEntry[];
  loaded: boolean;

  load: () => Promise<void>;
  addEntry: (
    entry: Omit<HistoryEntry, 'id' | 'createdAt'>,
  ) => Promise<HistoryEntry>;
  deleteEntry: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
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
    const prevEntries = get().entries;
    try {
      await db.history.add(entry);
      set((state) => ({ entries: [entry, ...state.entries] }));
      return entry;
    } catch (error) {
      set({ entries: prevEntries });
      throw error;
    }
  },

  deleteEntry: async (id) => {
    const prevEntries = get().entries;
    try {
      await db.history.delete(id);
      set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
    } catch (error) {
      set({ entries: prevEntries });
      throw error;
    }
  },

  clearAll: async () => {
    const prevEntries = get().entries;
    try {
      await db.history.clear();
      set({ entries: [] });
    } catch (error) {
      set({ entries: prevEntries });
      throw error;
    }
  },
}));
