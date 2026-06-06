import { create } from 'zustand';
import { db } from '@/db';
import type { EvalRunRecord } from '@/types/eval';

interface EvalRunsStore {
  records: EvalRunRecord[];
  loaded: boolean;

  load: () => Promise<void>;
  save: (record: EvalRunRecord) => Promise<EvalRunRecord>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

function sortRecords(records: EvalRunRecord[]): EvalRunRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const useEvalRunsStore = create<EvalRunsStore>((set) => ({
  records: [],
  loaded: false,

  load: async () => {
    const records = await db.evalRuns.orderBy('createdAt').reverse().toArray();
    set({ records, loaded: true });
  },

  save: async (record) => {
    await db.evalRuns.put(record);
    set((state) => {
      const others = state.records.filter((r) => r.id !== record.id);
      return { records: sortRecords([record, ...others]) };
    });
    return record;
  },

  rename: async (id, name) => {
    const trimmed = name.trim();
    await db.evalRuns.update(id, { name: trimmed || undefined });
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, name: trimmed || undefined } : r,
      ),
    }));
  },

  remove: async (id) => {
    await db.evalRuns.delete(id);
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
  },

  clearAll: async () => {
    await db.evalRuns.clear();
    set({ records: [] });
  },
}));
