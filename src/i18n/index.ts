import { useCallback } from 'react';
import { localeCatalogs, type Language } from '@/i18n/locales';
import { en } from '@/i18n/locales/en';
import type { MessageKey } from '@/i18n/types';
import { useLanguageStore } from '@/stores/language-store';

type Variables = Record<string, string | number>;

function getMessage(language: Language, key: MessageKey): string {
  const [namespace, messageKey] = key.split('.');
  const catalog = localeCatalogs[language] as Record<
    string,
    Record<string, string>
  >;
  const fallback = en as Record<string, Record<string, string>>;
  return (
    catalog[namespace]?.[messageKey] ?? fallback[namespace]?.[messageKey] ?? key
  );
}

export function translate(
  language: Language,
  key: MessageKey,
  variables?: Variables,
): string {
  let message = getMessage(language, key);
  if (!variables) return message;
  for (const [name, value] of Object.entries(variables)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}

export function countWords(language: Language, value: string): number {
  const segments = new Intl.Segmenter(language, {
    granularity: 'word',
  }).segment(value);
  return [...segments].filter((segment) => segment.isWordLike).length;
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

/**
 * Translate outside React components (stores, utils) where hooks are
 * unavailable. Snapshots the current language at call time.
 */
export function translateNow(key: MessageKey, variables?: Variables): string {
  return translate(useLanguageStore.getState().language, key, variables);
}

export type { MessageKey, Namespace, NamespaceKey } from '@/i18n/types';
