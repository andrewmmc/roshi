import { useEffect } from 'react';
import { useEnvironmentStore } from '@/stores/environment-store';
import { loadStoreSafely } from '@/stores/load-error';

export function useEnvironments() {
  const store = useEnvironmentStore();
  const { loaded, load } = store;

  useEffect(() => {
    if (!loaded) {
      loadStoreSafely('environments', load);
    }
  }, [loaded, load]);

  return store;
}
