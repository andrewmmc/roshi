import { create } from 'zustand';

export type SettingsPage = 'providers' | 'environments';

interface UiStore {
  settingsOpen: boolean;
  settingsPage: SettingsPage;
  setSettingsOpen: (open: boolean, page?: SettingsPage) => void;
  historySearchFocusGen: number;
  focusHistorySearch: () => void;
  aboutOpen: boolean;
  setAboutOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  settingsOpen: false,
  settingsPage: 'providers',
  setSettingsOpen: (open, page) =>
    set((s) => ({
      settingsOpen: open,
      settingsPage: page ?? s.settingsPage,
    })),
  historySearchFocusGen: 0,
  focusHistorySearch: () =>
    set((s) => ({ historySearchFocusGen: s.historySearchFocusGen + 1 })),
  aboutOpen: false,
  setAboutOpen: (open) => set({ aboutOpen: open }),
}));
