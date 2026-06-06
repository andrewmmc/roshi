import { useUiStore } from './ui-store';

describe('ui-store', () => {
  const getState = () => useUiStore.getState();

  beforeEach(() => {
    useUiStore.setState({
      settingsOpen: false,
      settingsPage: 'providers',
      settingsModelsProviderId: null,
      historySearchFocusGen: 0,
      aboutOpen: false,
    });
  });

  describe('settingsOpen', () => {
    it('defaults to false', () => {
      expect(getState().settingsOpen).toBe(false);
    });

    it('defaults settingsPage to providers', () => {
      expect(getState().settingsPage).toBe('providers');
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
});
