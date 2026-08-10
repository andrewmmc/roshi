import { useEffect } from 'react';
import { useProviderStore } from '@/stores/provider-store';
import { loadStoreSafely } from '@/stores/load-error';

export function useProviders() {
  const store = useProviderStore();
  const { loaded, load } = store;

  useEffect(() => {
    if (!loaded) {
      loadStoreSafely('providers', load);
    }
  }, [loaded, load]);

  return store;
}
