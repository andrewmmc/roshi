import { en } from '@/i18n/locales/en';
import { zhTW } from '@/i18n/locales/zh-TW';

export const localeCatalogs = {
  en,
  'zh-TW': zhTW,
} as const;

export type Language = keyof typeof localeCatalogs;

export const localeOptions: ReadonlyArray<{
  code: Language;
  nativeName: string;
  browserPrefixes: readonly string[];
}> = [
  { code: 'en', nativeName: 'English', browserPrefixes: ['en'] },
  {
    code: 'zh-TW',
    nativeName: '繁體中文',
    browserPrefixes: ['zh-TW', 'zh-Hant', 'zh-HK', 'zh-MO'],
  },
];

export const DEFAULT_LANGUAGE: Language = 'en';

export function isSupportedLanguage(value: string): value is Language {
  return value in localeCatalogs;
}
