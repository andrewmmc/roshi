import { translate } from '@/i18n';
import type { Language } from '@/i18n/locales';
import { useLanguageStore } from '@/stores/language-store';

export function formatRelativeTime(
  date: Date | string | number,
  language: Language = useLanguageStore.getState().language,
): string {
  const timestamp = new Date(date).getTime();
  const diff = Math.max(0, Date.now() - timestamp);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) {
    return translate(language, 'common.relativeSeconds', { count: sec });
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return translate(language, 'common.relativeMinutes', { count: min });
  }
  const hour = Math.floor(min / 60);
  if (hour < 24) {
    return translate(language, 'common.relativeHours', { count: hour });
  }
  const day = Math.floor(hour / 24);
  return translate(language, 'common.relativeDays', { count: day });
}
