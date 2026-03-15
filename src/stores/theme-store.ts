import { create } from 'zustand';

const STORAGE_KEY = 'llm-tester-theme';

export type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'light';
}

interface ThemeStore {
  theme: Theme;
  initialized: boolean;
  init: () => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'light',
  initialized: false,

  init: () => {
    const theme = getStoredTheme();
    applyTheme(theme);
    set({ theme, initialized: true });
  },

  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    set({ theme: next });
  },
}));
