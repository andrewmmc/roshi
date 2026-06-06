import { db } from '@/db';
import { toErrorMessage } from '@/lib/errors';

let lastSettingsSave = Promise.resolve();

/** Coalesce concurrent store load() calls into a single in-flight promise. */
export function createLoadGuard() {
  let inFlight: Promise<void> | null = null;

  return {
    run(isLoaded: () => boolean, load: () => Promise<void>): Promise<void> {
      if (isLoaded()) return Promise.resolve();
      if (inFlight) return inFlight;
      inFlight = load().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
  };
}

export async function persistSetting(
  key: string,
  value: unknown,
): Promise<void> {
  lastSettingsSave = lastSettingsSave.then(() =>
    db.settings.put({ key, value }).then(() => undefined),
  );
  await lastSettingsSave;
}

export async function loadSetting<T>(key: string): Promise<T | null> {
  const setting = await db.settings.get(key);
  if (setting?.value === undefined) return null;
  return setting.value as T;
}

export function replaceById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  next: Partial<T> | ((current: T) => T),
): T[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    if (typeof next === 'function') {
      return next(item);
    }
    return { ...item, ...next };
  });
}

export function removeById<T extends { id: string }>(
  items: readonly T[],
  id: string,
): T[] {
  return items.filter((item) => item.id !== id);
}

export function upsertById<T extends { id: string }>(
  items: readonly T[],
  item: T,
): T[] {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) return [...items, item];
  return items.map((entry, entryIndex) =>
    entryIndex === index ? item : entry,
  );
}

export function toStoreErrorMessage(error: unknown, fallback: string): string {
  return toErrorMessage(error, fallback);
}
