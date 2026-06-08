import { create } from 'zustand';

export type SettingsPage = 'providers' | 'environments' | 'models';
export type MainView = 'request' | 'eval';

const SIDEBAR_COLLAPSE_BREAKPOINT = 768;

interface UiStore {
  settingsOpen: boolean;
  settingsPage: SettingsPage;
  /** Optional provider id to focus when opening Settings > Models. */
  settingsModelsProviderId: string | null;
  setSettingsOpen: (open: boolean, page?: SettingsPage) => void;
  /** Open Settings > Models pre-filtered to a specific provider. */
  openModelMarket: (providerId?: string | null) => void;
  setSettingsModelsProviderId: (providerId: string | null) => void;
  historySearchFocusGen: number;
  focusHistorySearch: () => void;
  aboutOpen: boolean;
  setAboutOpen: (open: boolean) => void;
  checklistOpen: boolean;
  setChecklistOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  /** Increments every time commandPaletteOpen transitions to true. Used as a key to remount the palette content and reset its local state. */
  commandPaletteOpenCount: number;
  setCommandPaletteOpen: (open: boolean) => void;
  newRequestDiscardOpen: boolean;
  setNewRequestDiscardOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  mainView: MainView;
  setMainView: (view: MainView) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  settingsOpen: false,
  settingsPage: 'providers',
  settingsModelsProviderId: null,
  setSettingsOpen: (open, page) =>
    set((s) => ({
      settingsOpen: open,
      settingsPage: page ?? s.settingsPage,
    })),
  openModelMarket: (providerId = null) =>
    set({
      settingsOpen: true,
      settingsPage: 'models',
      settingsModelsProviderId: providerId,
    }),
  setSettingsModelsProviderId: (providerId) =>
    set({ settingsModelsProviderId: providerId }),
  historySearchFocusGen: 0,
  focusHistorySearch: () =>
    set((s) => ({ historySearchFocusGen: s.historySearchFocusGen + 1 })),
  aboutOpen: false,
  setAboutOpen: (open) => set({ aboutOpen: open }),
  checklistOpen: false,
  setChecklistOpen: (open) => set({ checklistOpen: open }),
  commandPaletteOpen: false,
  commandPaletteOpenCount: 0,
  setCommandPaletteOpen: (open) =>
    set((s) => ({
      commandPaletteOpen: open,
      commandPaletteOpenCount: open
        ? s.commandPaletteOpenCount + 1
        : s.commandPaletteOpenCount,
    })),
  newRequestDiscardOpen: false,
  setNewRequestDiscardOpen: (open) => set({ newRequestDiscardOpen: open }),
  shortcutsOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  mainView: 'request',
  setMainView: (mainView) => set({ mainView }),
  sidebarCollapsed: window.innerWidth < SIDEBAR_COLLAPSE_BREAKPOINT,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
