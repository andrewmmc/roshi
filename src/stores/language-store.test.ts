import {
  LANGUAGE_STORAGE_KEY,
  useLanguageStore,
} from '@/stores/language-store';

describe('language store', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.setState({ language: 'en', initialized: false });
  });

  it('persists and applies the selected language', () => {
    useLanguageStore.getState().setLanguage('zh-TW');

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-TW');
    expect(document.documentElement.lang).toBe('zh-TW');
    expect(useLanguageStore.getState().language).toBe('zh-TW');
  });

  it('restores a persisted language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh-TW');
    useLanguageStore.getState().init();

    expect(useLanguageStore.getState()).toMatchObject({
      language: 'zh-TW',
      initialized: true,
    });
  });

  it('falls back safely when storage is unavailable', () => {
    const storage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(() => useLanguageStore.getState().init()).not.toThrow();
      expect(useLanguageStore.getState().language).toBe('en');
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: storage,
      });
    }
  });
});
