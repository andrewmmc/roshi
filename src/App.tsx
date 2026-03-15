import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { useThemeStore } from '@/stores/theme-store';

function App() {
  const loadProviders = useProviderStore((s) => s.load);
  const loadHistory = useHistoryStore((s) => s.load);
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    loadProviders();
    loadHistory();
  }, [loadProviders, loadHistory]);

  return <AppLayout />;
}

export default App;
