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
import { useProxyStore } from '@/stores/proxy-store';
import { Loader2 } from 'lucide-react';
import { loadStoreSafely } from '@/stores/load-error';
import { useLanguageStore } from '@/stores/language-store';
import { useTranslation } from '@/i18n';

export function App() {
  const loadProviders = useProviderStore((s) => s.load);
  const loadHistory = useHistoryStore((s) => s.load);
  const initTheme = useThemeStore((s) => s.init);
  const initLanguage = useLanguageStore((s) => s.init);
  const loadProxy = useProxyStore((s) => s.load);
  const requestSessionHydrated = useTabStore((s) => s.hydrated);
  const { t } = useTranslation();
  useGlobalShortcuts();
  useRequestSession();

  useEffect(() => {
    initTheme();
    initLanguage();
  }, [initLanguage, initTheme]);

  useEffect(() => {
    loadStoreSafely('providers', loadProviders);
    loadStoreSafely('history', loadHistory);
    loadStoreSafely('proxy settings', loadProxy);
  }, [loadProviders, loadHistory, loadProxy]);

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
          {t('restoringWorkspace')}
        </div>
      )}
      <ToastContainer />
    </ErrorBoundary>
  );
}
