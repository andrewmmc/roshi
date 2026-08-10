import { useEffect } from 'react';
import { useCollectionStore } from '@/stores/collection-store';
import { loadStoreSafely } from '@/stores/load-error';

export function useCollections() {
  const store = useCollectionStore();
  const { loaded, load } = store;

  useEffect(() => {
    if (!loaded) {
      loadStoreSafely('collections', load);
    }
  }, [loaded, load]);

  return store;
}
