import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Boxes, Server, Settings, Variable, X } from 'lucide-react';
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
import type { ProviderConfig } from '@/types/provider';
import { cn } from '@/lib/utils';

type SettingsSection = {
  id: SettingsPage;
  label: string;
  icon: LucideIcon;
};

const SECTIONS: SettingsSection[] = [
  { id: 'providers', label: 'Providers', icon: Server },
  { id: 'models', label: 'Models', icon: Boxes },
  { id: 'environments', label: 'Environments', icon: Variable },
];

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
          className="border-border !flex max-h-[82vh] min-h-0 !max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-none ring-0 sm:max-w-3xl"
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
