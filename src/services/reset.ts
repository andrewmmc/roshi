import { db } from '@/db';
import { useProviderStore } from '@/stores/provider-store';

export async function resetApplication(): Promise<void> {
  await db.delete();
  localStorage.clear();
  window.location.reload();
}

export async function resetProviders(): Promise<void> {
  await useProviderStore.getState().resetAllProviders();
}
