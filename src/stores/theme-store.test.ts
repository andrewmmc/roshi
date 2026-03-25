import { useThemeStore } from './theme-store';

describe('theme-store', () => {
  const getState = () => useThemeStore.getState();

  beforeEach(() => {
    useThemeStore.setState({ theme: 'light', initialized: false });
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('init', () => {
    it('defaults to light when no stored theme', () => {
      getState().init();
      expect(getState().theme).toBe('light');
      expect(getState().initialized).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('loads dark theme from localStorage', () => {
      localStorage.setItem('llm-tester-theme', 'dark');
      getState().init();
      expect(getState().theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('loads light theme from localStorage', () => {
      localStorage.setItem('llm-tester-theme', 'light');
      getState().init();
      expect(getState().theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('defaults to light for invalid stored value', () => {
      localStorage.setItem('llm-tester-theme', 'invalid');
      getState().init();
      expect(getState().theme).toBe('light');
    });
  });

  describe('toggle', () => {
    it('toggles from light to dark', () => {
      getState().init();
      getState().toggle();

      expect(getState().theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('llm-tester-theme')).toBe('dark');
    });

    it('toggles from dark to light', () => {
      localStorage.setItem('llm-tester-theme', 'dark');
      getState().init();
      getState().toggle();

      expect(getState().theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('llm-tester-theme')).toBe('light');
    });
  });
});
