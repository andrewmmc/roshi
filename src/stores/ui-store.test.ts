import { useUiStore } from './ui-store';

describe('ui-store', () => {
  const getState = () => useUiStore.getState();

  beforeEach(() => {
    useUiStore.setState({
      settingsOpen: false,
      settingsPage: 'providers',
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
