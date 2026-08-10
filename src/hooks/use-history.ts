import { useEffect } from 'react';
import { useHistoryStore } from '@/stores/history-store';
import { loadStoreSafely } from '@/stores/load-error';

export function useHistory() {
  const store = useHistoryStore();
  const { loaded, load } = store;

  useEffect(() => {
    if (!loaded) {
      loadStoreSafely('history', load);
    }
  }, [loaded, load]);

  return store;
}
