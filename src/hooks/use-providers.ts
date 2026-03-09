import { useEffect } from 'react';
import { useProviderStore } from '@/stores/provider-store';

export function useProviders() {
  const store = useProviderStore();

  useEffect(() => {
    if (!store.loaded) {
      store.load();
    }
  }, [store.loaded, store.load]);

  return store;
}
