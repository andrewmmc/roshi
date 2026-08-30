import { create } from 'zustand';

export type Language = 'en' | 'zh-TW';

export const LANGUAGE_STORAGE_KEY = 'roshi-language';

function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'en' || stored === 'zh-TW') return stored;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en';
}

function applyLanguage(language: Language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.documentElement.dir = 'ltr';
}

interface LanguageStore {
  language: Language;
  initialized: boolean;
  init: () => void;
  setLanguage: (language: Language) => void;
}

const initialLanguage = detectLanguage();
applyLanguage(initialLanguage);

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: initialLanguage,
  initialized: false,
  init: () => {
    const language = detectLanguage();
    applyLanguage(language);
    set({ language, initialized: true });
  },
  setLanguage: (language) => {
    applyLanguage(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    set({ language });
  },
}));
