import { useUiStore } from './ui-store';

describe('ui-store', () => {
  const getState = () => useUiStore.getState();

  beforeEach(() => {
    useUiStore.setState({
      providerSettingsOpen: false,
      historySearchFocusGen: 0,
      aboutOpen: false,
    });
  });

  describe('providerSettingsOpen', () => {
    it('defaults to false', () => {
      expect(getState().providerSettingsOpen).toBe(false);
    });

    it('sets providerSettingsOpen to true', () => {
      getState().setProviderSettingsOpen(true);
      expect(getState().providerSettingsOpen).toBe(true);
    });

    it('sets providerSettingsOpen back to false', () => {
      getState().setProviderSettingsOpen(true);
      getState().setProviderSettingsOpen(false);
      expect(getState().providerSettingsOpen).toBe(false);
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
