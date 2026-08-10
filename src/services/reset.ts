import { db } from '@/db';
import { useProviderStore } from '@/stores/provider-store';

const APP_STORAGE_PREFIX = 'llm-tester-';

function clearApplicationLocalStorage(): void {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(APP_STORAGE_PREFIX)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}

export async function resetApplication(): Promise<void> {
  await db.delete();
  clearApplicationLocalStorage();
  window.location.reload();
}

export async function resetProviders(): Promise<void> {
  await useProviderStore.getState().resetAllProviders();
}
