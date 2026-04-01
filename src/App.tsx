import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AboutDialog } from '@/components/AboutDialog';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { useThemeStore } from '@/stores/theme-store';

export function App() {
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

  return (
    <ErrorBoundary>
      <AboutDialog />
      <AppLayout />
    </ErrorBoundary>
  );
}
