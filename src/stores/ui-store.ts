import { create } from 'zustand';

export type SettingsPage =
  'general' | 'proxy' | 'providers' | 'environments' | 'models';
export type MainView = 'request' | 'eval';
export type SidebarSection = 'history' | 'collections' | 'evals';

const SIDEBAR_COLLAPSE_BREAKPOINT = 768;

interface UiStore {
  settingsOpen: boolean;
  settingsPage: SettingsPage;
  /** Optional provider id to focus when opening Settings > Models. */
  settingsModelsProviderId: string | null;
  /** Optional provider id to open directly in Settings > Providers. */
  settingsProviderId: string | null;
  /** Focus the API-key field after opening a provider directly. */
  settingsProviderFocusApiKey: boolean;
  setSettingsOpen: (open: boolean, page?: SettingsPage) => void;
  /** Open Settings > Providers, optionally focused on a provider/API key. */
  openProviderSettings: (
    providerId?: string | null,
    focusApiKey?: boolean,
  ) => void;
  clearSettingsProviderTarget: () => void;
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
  /** Tab awaiting confirmation before its local composer/response is discarded. */
  pendingTabCloseId: string | null;
  setPendingTabCloseId: (id: string | null) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  mainView: MainView;
  setMainView: (view: MainView) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarSection: SidebarSection;
  setSidebarSection: (section: SidebarSection) => void;
  /** Expand the sidebar (if collapsed) and switch it to the given section. */
  openSidebarSection: (section: SidebarSection) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  settingsOpen: false,
  settingsPage: 'general',
  settingsModelsProviderId: null,
  settingsProviderId: null,
  settingsProviderFocusApiKey: false,
  setSettingsOpen: (open, page) =>
    set((s) => ({
      settingsOpen: open,
      settingsPage: page ?? s.settingsPage,
    })),
  openProviderSettings: (providerId = null, focusApiKey = false) =>
    set({
      settingsOpen: true,
      settingsPage: 'providers',
      settingsProviderId: providerId,
      settingsProviderFocusApiKey: focusApiKey,
    }),
  clearSettingsProviderTarget: () =>
    set({
      settingsProviderId: null,
      settingsProviderFocusApiKey: false,
    }),
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
  pendingTabCloseId: null,
  setPendingTabCloseId: (pendingTabCloseId) => set({ pendingTabCloseId }),
  shortcutsOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  mainView: 'request',
  setMainView: (mainView) => set({ mainView }),
  sidebarCollapsed: window.innerWidth < SIDEBAR_COLLAPSE_BREAKPOINT,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  sidebarSection: 'history',
  setSidebarSection: (sidebarSection) => set({ sidebarSection }),
  openSidebarSection: (sidebarSection) =>
    set({ sidebarSection, sidebarCollapsed: false }),
}));
