import { db } from '@/db';

export async function resetApplication(): Promise<void> {
  await db.delete();
  localStorage.clear();
  window.location.reload();
}

export async function resetProviders(): Promise<void> {
  const { useProviderStore } = await import('@/stores/provider-store');
  await useProviderStore.getState().resetAllProviders();
}
