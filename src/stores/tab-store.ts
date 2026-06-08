import { create } from 'zustand';

interface TabStore {
  createTab: () => void;
  duplicateActiveTab: () => void;
}

export const useTabStore = create<TabStore>(() => ({
  createTab: () => {
    // Tab management is not yet implemented.
  },
  duplicateActiveTab: () => {
    // Tab management is not yet implemented.
  },
}));
