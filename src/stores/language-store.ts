import { create } from 'zustand';
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  localeOptions,
  type Language,
} from '@/i18n/locales';

export type { Language } from '@/i18n/locales';

export const LANGUAGE_STORAGE_KEY = 'roshi-language';

function detectLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const storage = globalThis.localStorage;
  const stored = storage?.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && isSupportedLanguage(stored)) return stored;

  const browserLanguages = navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  for (const browserLanguage of browserLanguages) {
    const normalized = browserLanguage.toLowerCase();
    const match = localeOptions.find((option) =>
      option.browserPrefixes.some((prefix) =>
        normalized.startsWith(prefix.toLowerCase()),
      ),
    );
    if (match) return match.code;
  }
  return DEFAULT_LANGUAGE;
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
    globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
    set({ language });
  },
}));
