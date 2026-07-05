import { useUiStore } from './ui-store';

describe('ui-store', () => {
  const getState = () => useUiStore.getState();

  beforeEach(() => {
    useUiStore.setState({
      settingsOpen: false,
      settingsPage: 'general',
      settingsModelsProviderId: null,
      historySearchFocusGen: 0,
      aboutOpen: false,
      checklistOpen: false,
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      commandPaletteOpenCount: 0,
      newRequestDiscardOpen: false,
      shortcutsOpen: false,
    });
  });

  describe('settingsOpen', () => {
    it('defaults to false', () => {
      expect(getState().settingsOpen).toBe(false);
    });

    it('defaults settingsPage to general', () => {
      expect(getState().settingsPage).toBe('general');
    });

    it('opens settings and preserves the current page when page is omitted', () => {
      useUiStore.setState({ settingsPage: 'environments' });
      getState().setSettingsOpen(true);
      expect(getState().settingsOpen).toBe(true);
      expect(getState().settingsPage).toBe('environments');
    });

    it('opens settings to a specific page', () => {
      getState().setSettingsOpen(true, 'environments');
      expect(getState().settingsOpen).toBe(true);
      expect(getState().settingsPage).toBe('environments');
    });

    it('closes settings', () => {
      getState().setSettingsOpen(true);
      getState().setSettingsOpen(false);
      expect(getState().settingsOpen).toBe(false);
    });
  });

  describe('openModelMarket', () => {
    it('opens settings on the models page with no filter by default', () => {
      getState().openModelMarket();
      expect(getState().settingsOpen).toBe(true);
      expect(getState().settingsPage).toBe('models');
      expect(getState().settingsModelsProviderId).toBeNull();
    });

    it('opens the models page pre-filtered to a specific provider', () => {
      getState().openModelMarket('builtin-openai');
      expect(getState().settingsPage).toBe('models');
      expect(getState().settingsModelsProviderId).toBe('builtin-openai');
    });

    it('lets callers clear the filter explicitly', () => {
      getState().openModelMarket('p1');
      getState().setSettingsModelsProviderId(null);
      expect(getState().settingsModelsProviderId).toBeNull();
    });
  });

  describe('focusHistorySearch', () => {
    it('defaults historySearchFocusGen to 0', () => {
      expect(getState().historySearchFocusGen).toBe(0);
    });

    it('increments historySearchFocusGen on each call', () => {
      getState().focusHistorySearch();
      expect(getState().historySearchFocusGen).toBe(1);

      getState().focusHistorySearch();
      expect(getState().historySearchFocusGen).toBe(2);
    });
  });

  describe('mainView', () => {
    it('defaults to request', () => {
      expect(getState().mainView).toBe('request');
    });

    it('switches to eval view', () => {
      getState().setMainView('eval');
      expect(getState().mainView).toBe('eval');
    });
  });

  describe('sidebarSection', () => {
    it('defaults to history', () => {
      expect(getState().sidebarSection).toBe('history');
    });

    it('updates the active sidebar section', () => {
      getState().setSidebarSection('collections');
      expect(getState().sidebarSection).toBe('collections');
    });

    it('opens a sidebar section and expands the sidebar', () => {
      useUiStore.setState({
        sidebarCollapsed: true,
        sidebarSection: 'history',
      });
      getState().openSidebarSection('evals');
      expect(getState().sidebarSection).toBe('evals');
      expect(getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('sidebarCollapsed', () => {
    it('defaults to false in test environment', () => {
      expect(getState().sidebarCollapsed).toBe(false);
    });

    it('initializes as collapsed on narrow screens', async () => {
      vi.resetModules();
      const originalWidth = window.innerWidth;

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 640,
      });

      const { useUiStore: freshUiStore } = await import('./ui-store');

      expect(freshUiStore.getState().sidebarCollapsed).toBe(true);

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: originalWidth,
      });
    });

    it('collapses the sidebar', () => {
      getState().setSidebarCollapsed(true);
      expect(getState().sidebarCollapsed).toBe(true);
    });

    it('expands the sidebar', () => {
      useUiStore.setState({ sidebarCollapsed: true });
      getState().setSidebarCollapsed(false);
      expect(getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('commandPaletteOpen', () => {
    it('defaults to false', () => {
      expect(getState().commandPaletteOpen).toBe(false);
    });

    it('opens the palette and increments the counter', () => {
      getState().setCommandPaletteOpen(true);
      expect(getState().commandPaletteOpen).toBe(true);
      expect(getState().commandPaletteOpenCount).toBe(1);
    });

    it('does not increment the counter when closing', () => {
      getState().setCommandPaletteOpen(true);
      getState().setCommandPaletteOpen(false);
      expect(getState().commandPaletteOpen).toBe(false);
      expect(getState().commandPaletteOpenCount).toBe(1);
    });
  });

  describe('newRequestDiscardOpen', () => {
    it('defaults to false', () => {
      expect(getState().newRequestDiscardOpen).toBe(false);
    });

    it('can be opened and closed', () => {
      getState().setNewRequestDiscardOpen(true);
      expect(getState().newRequestDiscardOpen).toBe(true);
      getState().setNewRequestDiscardOpen(false);
      expect(getState().newRequestDiscardOpen).toBe(false);
    });
  });

  describe('shortcutsOpen', () => {
    it('defaults to false', () => {
      expect(getState().shortcutsOpen).toBe(false);
    });

    it('can be opened and closed', () => {
      getState().setShortcutsOpen(true);
      expect(getState().shortcutsOpen).toBe(true);
      getState().setShortcutsOpen(false);
      expect(getState().shortcutsOpen).toBe(false);
    });
  });

  describe('aboutOpen', () => {
    it('defaults to false', () => {
      expect(getState().aboutOpen).toBe(false);
    });

    it('sets aboutOpen to true', () => {
      getState().setAboutOpen(true);
      expect(getState().aboutOpen).toBe(true);
    });

    it('sets aboutOpen back to false', () => {
      getState().setAboutOpen(true);
      getState().setAboutOpen(false);
      expect(getState().aboutOpen).toBe(false);
    });
  });

  describe('checklistOpen', () => {
    it('defaults to false', () => {
      expect(getState().checklistOpen).toBe(false);
    });

    it('can be opened and closed', () => {
      getState().setChecklistOpen(true);
      expect(getState().checklistOpen).toBe(true);

      getState().setChecklistOpen(false);
      expect(getState().checklistOpen).toBe(false);
    });
  });
});
