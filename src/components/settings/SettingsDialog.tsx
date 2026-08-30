import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  ChevronDown,
  MonitorCog,
  Languages,
  Network,
  RotateCcw,
  Server,
  Settings,
  Variable,
  X,
} from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { KbdShortcut } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProviderSettings } from '@/components/providers/ProviderManager';
import { ModelMarket } from '@/components/models/ModelMarket';
import {
  EnvironmentSettings,
  EnvironmentSettingsFooter,
} from '@/components/environments/EnvironmentManager';
import { useUiStore, type SettingsPage } from '@/stores/ui-store';
import { useThemeStore } from '@/stores/theme-store';
import { useProxyStore, type ProxyConfig } from '@/stores/proxy-store';
import { resetApplication, resetProviders } from '@/services/reset';
import type { ProviderConfig } from '@/types/provider';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useLanguageStore, type Language } from '@/stores/language-store';
import { useTranslation, type MessageKey } from '@/i18n';

type SettingsSection = {
  id: SettingsPage;
  label: MessageKey;
  icon: LucideIcon;
};

const SECTIONS: SettingsSection[] = [
  { id: 'general', label: 'general', icon: MonitorCog },
  { id: 'proxy', label: 'proxy', icon: Network },
  { id: 'providers', label: 'providers', icon: Server },
  { id: 'models', label: 'models', icon: Boxes },
  { id: 'environments', label: 'environments', icon: Variable },
];

function validateProxyUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname
    );
  } catch {
    return false;
  }
}

function ProxySettings() {
  const { t } = useTranslation();
  const httpProxy = useProxyStore((s) => s.httpProxy);
  const httpsProxy = useProxyStore((s) => s.httpsProxy);
  const noProxy = useProxyStore((s) => s.noProxy);
  const save = useProxyStore((s) => s.save);
  const [draft, setDraft] = useState<ProxyConfig>({
    httpProxy,
    httpsProxy,
    noProxy,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(
    () => setDraft({ httpProxy, httpsProxy, noProxy }),
    [httpProxy, httpsProxy, noProxy],
  );

  const update = (key: keyof ProxyConfig, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
    setSaved(false);
  };

  const handleSave = async () => {
    if (!validateProxyUrl(draft.httpProxy)) {
      setError(t('invalidProxyUrl', { name: 'HTTP_PROXY' }));
      return;
    }
    if (!validateProxyUrl(draft.httpsProxy)) {
      setError(t('invalidProxyUrl', { name: 'HTTPS_PROXY' }));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await save(draft);
      setSaved(true);
    } catch {
      setError(t('proxySaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border bg-muted/20 border-b px-5 py-4">
        <h2 className="text-[15px] font-medium tracking-tight">{t('proxy')}</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t('proxyDescription')}
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="space-y-1.5">
          <label htmlFor="http-proxy" className="text-xs font-medium">
            HTTP_PROXY
          </label>
          <Input
            id="http-proxy"
            value={draft.httpProxy}
            onChange={(event) => update('httpProxy', event.target.value)}
            placeholder="http://proxy.example:8080"
            spellCheck={false}
            autoCapitalize="none"
          />
          <p className="text-muted-foreground text-[11px]">
            {t('httpProxyDescription')}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="https-proxy" className="text-xs font-medium">
            HTTPS_PROXY
          </label>
          <Input
            id="https-proxy"
            value={draft.httpsProxy}
            onChange={(event) => update('httpsProxy', event.target.value)}
            placeholder="http://proxy.example:8080"
            spellCheck={false}
            autoCapitalize="none"
          />
          <p className="text-muted-foreground text-[11px]">
            {t('httpsProxyDescription')}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="no-proxy" className="text-xs font-medium">
            NO_PROXY
          </label>
          <Input
            id="no-proxy"
            value={draft.noProxy}
            onChange={(event) => update('noProxy', event.target.value)}
            placeholder="localhost,127.0.0.1,.internal.example"
            spellCheck={false}
            autoCapitalize="none"
          />
          <p className="text-muted-foreground text-[11px]">
            {t('noProxyDescription')}
          </p>
        </div>
        {error && (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
            {saving ? t('saving') : t('saveProxySettings')}
          </Button>
          {saved && (
            <span className="text-muted-foreground text-xs" role="status">
              {t('proxySaved')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" size="sm" />}>
            {t('cancel')}
          </AlertDialogClose>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {t('reset')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function GeneralSettings() {
  const { t, language } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const darkMode = theme === 'dark';
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    mode: 'all' | 'providers';
  }>({ open: false, mode: 'all' });

  const handleConfirmReset = () => {
    if (confirmDialog.mode === 'all') {
      void resetApplication();
    } else {
      void resetProviders();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border bg-muted/20 border-b px-5 py-4">
        <h2 className="text-[15px] font-medium tracking-tight">
          {t('general')}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t('configurePreferences')}
        </p>
      </div>

      <div className="flex-1 space-y-3 px-5 py-4">
        <div className="border-border/70 bg-muted/20 flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">{t('darkMode')}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('darkModeDescription')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={darkMode}
            aria-label={t('darkMode')}
            onClick={() => setTheme(darkMode ? 'light' : 'dark')}
            className={cn(
              'focus-visible:border-ring focus-visible:ring-ring/50 relative h-6 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3',
              darkMode ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'bg-background absolute inset-y-0 left-0.5 my-auto h-5 w-5 rounded-full shadow-sm transition-transform',
                darkMode && 'translate-x-4',
              )}
            />
          </button>
        </div>

        <div className="border-border/70 bg-muted/20 flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Languages className="text-muted-foreground h-3.5 w-3.5" />
              {t('language')}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('languageDescription')}
            </p>
          </div>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as Language)}
          >
            <SelectTrigger className="w-44 shrink-0" aria-label={t('language')}>
              <span className="flex-1 text-left">
                {language === 'en' ? t('english') : t('traditionalChinese')}
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="en">{t('english')}</SelectItem>
              <SelectItem value="zh-TW">{t('traditionalChinese')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-border/70 bg-muted/20 flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">{t('resetApplication')}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('resetApplicationDescription')}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive rounded-r-none border-r-0"
              onClick={() => setConfirmDialog({ open: true, mode: 'all' })}
            >
              <RotateCcw className="h-3 w-3" />
              {t('reset')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive rounded-l-none px-1.5"
                    aria-label={t('moreResetOptions')}
                  />
                }
              >
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={4}
                className="min-w-52"
              >
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmDialog({ open: true, mode: 'all' })}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('resetEntireApplication')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    setConfirmDialog({ open: true, mode: 'providers' })
                  }
                >
                  <Server className="h-3.5 w-3.5" />
                  {t('resetProvidersOnly')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ResetConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={
          confirmDialog.mode === 'all'
            ? t('resetEntireApplicationQuestion')
            : t('resetProvidersQuestion')
        }
        description={
          confirmDialog.mode === 'all'
            ? t('resetEntireApplicationWarning')
            : t('resetProvidersWarning')
        }
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}

export function SettingsDialog() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.settingsOpen);
  const settingsPage = useUiStore((s) => s.settingsPage);
  const settingsProviderId = useUiStore((s) => s.settingsProviderId);
  const settingsProviderFocusApiKey = useUiStore(
    (s) => s.settingsProviderFocusApiKey,
  );
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const openProviderSettings = useUiStore((s) => s.openProviderSettings);
  const clearSettingsProviderTarget = useUiStore(
    (s) => s.clearSettingsProviderTarget,
  );

  const handleClose = () => setSettingsOpen(false);

  const handleEditProvider = (provider: ProviderConfig) => {
    openProviderSettings(provider.id);
  };

  return (
    <>
      <IconButton
        variant="ghost"
        size="icon-sm"
        aria-label={t('settings')}
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setSettingsOpen(true)}
        tooltip={
          <span className="flex items-center gap-1.5">
            {t('settings')}
            <KbdShortcut mac="⌘⇧," win="Ctrl+Shift+," />
          </span>
        }
      >
        <Settings className="h-3.5 w-3.5" />
      </IconButton>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => setSettingsOpen(nextOpen)}
      >
        <DialogContent
          className="border-border !flex h-[720px] max-h-[82vh] min-h-0 !max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-none ring-0 sm:max-w-3xl"
          showCloseButton={false}
          showOverlay={false}
        >
          <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-2.5">
            <DialogTitle className="text-[15px] tracking-tight">
              {t('settings')}
            </DialogTitle>
            <IconButton
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              tooltip={t('close')}
              aria-label={t('close')}
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="flex min-h-0 flex-1 max-sm:flex-col">
            <nav
              aria-label={t('settingsSections')}
              className="border-border flex w-32 shrink-0 flex-col gap-0.5 border-r p-1.5 max-sm:w-full max-sm:flex-row max-sm:overflow-x-auto max-sm:border-r-0 max-sm:border-b"
            >
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={settingsPage === id ? 'page' : undefined}
                  onClick={() => setSettingsOpen(true, id)}
                  className={cn(
                    'flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium whitespace-nowrap transition-colors max-sm:shrink-0',
                    settingsPage === id
                      ? 'bg-muted/50 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {t(label)}
                </button>
              ))}
            </nav>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {settingsPage === 'general' && <GeneralSettings />}
              {settingsPage === 'proxy' && <ProxySettings />}
              {settingsPage === 'providers' && (
                <ProviderSettings
                  onClose={handleClose}
                  pendingEditProviderId={settingsProviderId}
                  focusApiKey={settingsProviderFocusApiKey}
                  onConsumePendingEdit={clearSettingsProviderTarget}
                />
              )}
              {settingsPage === 'models' && (
                <ModelMarket
                  onClose={handleClose}
                  onEditProvider={handleEditProvider}
                />
              )}
              {settingsPage === 'environments' && (
                <>
                  <EnvironmentSettings />
                  <EnvironmentSettingsFooter onClose={handleClose} />
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
