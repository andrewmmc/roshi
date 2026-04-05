import { create } from 'zustand';

interface UiStore {
  providerSettingsOpen: boolean;
  setProviderSettingsOpen: (open: boolean) => void;
  historySearchFocusGen: number;
  focusHistorySearch: () => void;
  aboutOpen: boolean;
  setAboutOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  providerSettingsOpen: false,
  setProviderSettingsOpen: (open) => set({ providerSettingsOpen: open }),
  historySearchFocusGen: 0,
  focusHistorySearch: () =>
    set((s) => ({ historySearchFocusGen: s.historySearchFocusGen + 1 })),
  aboutOpen: false,
  setAboutOpen: (open) => set({ aboutOpen: open }),
}));
