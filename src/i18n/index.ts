import { useCallback } from 'react';
import { en, zhTW, type MessageKey } from '@/i18n/messages';
import { useLanguageStore, type Language } from '@/stores/language-store';

type Variables = Record<string, string | number>;

const catalogs = { en, 'zh-TW': zhTW } as const;

export function translate(
  language: Language,
  key: MessageKey,
  variables?: Variables,
): string {
  let message: string = catalogs[language][key] ?? en[key];
  if (!variables) return message;
  for (const [name, value] of Object.entries(variables)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const t = useCallback(
    (key: MessageKey, variables?: Variables) =>
      translate(language, key, variables),
    [language],
  );
  const formatNumber = useCallback(
    (value: number) => new Intl.NumberFormat(language).format(value),
    [language],
  );
  const formatDateTime = useCallback(
    (value: Date | number) =>
      new Intl.DateTimeFormat(language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(value),
    [language],
  );
  return { language, t, formatNumber, formatDateTime };
}

export type { MessageKey } from '@/i18n/messages';
