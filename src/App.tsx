import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AboutDialog } from '@/components/AboutDialog';
import { CommandPalette } from '@/components/CommandPalette';
import { ShortcutsDialog } from '@/components/ShortcutsDialog';
import { ToastContainer } from '@/components/ui/toast';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { useThemeStore } from '@/stores/theme-store';
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts';
import { useRequestSession } from '@/hooks/use-request-session';
import { useTabStore } from '@/stores/tab-store';
import { Loader2 } from 'lucide-react';

export function App() {
  const loadProviders = useProviderStore((s) => s.load);
  const loadHistory = useHistoryStore((s) => s.load);
  const initTheme = useThemeStore((s) => s.init);
  const requestSessionHydrated = useTabStore((s) => s.hydrated);
  useGlobalShortcuts();
  useRequestSession();

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
      <CommandPalette />
      <ShortcutsDialog />
      {requestSessionHydrated ? (
        <AppLayout />
      ) : (
        <div
          className="bg-background text-muted-foreground flex h-screen w-screen items-center justify-center gap-2 text-[13px]"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Restoring workspace…
        </div>
      )}
      <ToastContainer />
    </ErrorBoundary>
  );
}
