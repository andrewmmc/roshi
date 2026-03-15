import { useEffect } from 'react';
import { useHistoryStore } from '@/stores/history-store';

export function useHistory() {
  const store = useHistoryStore();
  const { loaded, load } = store;

  useEffect(() => {
    if (!loaded) {
      load();
    }
  }, [loaded, load]);

  return store;
}
