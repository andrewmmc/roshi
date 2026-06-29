import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Boxes, MonitorCog, Server, Settings, Variable, X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { KbdShortcut } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ProviderSettings } from '@/components/providers/ProviderManager';
import { ModelMarket } from '@/components/models/ModelMarket';
import {
  EnvironmentSettings,
  EnvironmentSettingsFooter,
} from '@/components/environments/EnvironmentManager';
import { useUiStore, type SettingsPage } from '@/stores/ui-store';
import { useThemeStore } from '@/stores/theme-store';
import type { ProviderConfig } from '@/types/provider';
import { cn } from '@/lib/utils';

type SettingsSection = {
  id: SettingsPage;
  label: string;
  icon: LucideIcon;
};

const SECTIONS: SettingsSection[] = [
  { id: 'general', label: 'General', icon: MonitorCog },
  { id: 'providers', label: 'Providers', icon: Server },
  { id: 'models', label: 'Models', icon: Boxes },
  { id: 'environments', label: 'Environments', icon: Variable },
];

function GeneralSettings() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const darkMode = theme === 'dark';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border border-b px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">General</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Configure app-wide preferences.
        </p>
      </div>

      <div className="flex-1 px-5 py-4">
        <div className="border-border/70 bg-muted/20 flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">Dark mode</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Use a darker color theme throughout Roshi.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={darkMode}
            aria-label="Dark mode"
            onClick={() => setTheme(darkMode ? 'light' : 'dark')}
            className={cn(
              'focus-visible:border-ring focus-visible:ring-ring/50 relative h-6 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3',
              darkMode ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'bg-background absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow-sm transition-transform',
                darkMode && 'translate-x-4',
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen);
  const settingsPage = useUiStore((s) => s.settingsPage);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const [pendingEditProviderId, setPendingEditProviderId] = useState<
    string | null
  >(null);

  const handleClose = () => setSettingsOpen(false);

  const handleEditProvider = (provider: ProviderConfig) => {
    setPendingEditProviderId(provider.id);
    setSettingsOpen(true, 'providers');
  };

  return (
    <>
      <IconButton
        variant="ghost"
        size="icon"
        aria-label="Settings"
        className="text-muted-foreground hover:text-foreground h-7 w-7"
        onClick={() => setSettingsOpen(true)}
        tooltip={
          <span className="flex items-center gap-1.5">
            Settings
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
              Settings
            </DialogTitle>
            <IconButton
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              tooltip="Close"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="flex min-h-0 flex-1">
            <nav
              aria-label="Settings sections"
              className="border-border flex w-32 shrink-0 flex-col gap-0.5 border-r p-1.5"
            >
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSettingsOpen(true, id)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors',
                    settingsPage === id
                      ? 'bg-muted/50 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {settingsPage === 'general' && <GeneralSettings />}
              {settingsPage === 'providers' && (
                <ProviderSettings
                  onClose={handleClose}
                  pendingEditProviderId={pendingEditProviderId}
                  onConsumePendingEdit={() => setPendingEditProviderId(null)}
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
