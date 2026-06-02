import type { LucideIcon } from 'lucide-react';
import { Server, Settings, Variable, X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { KbdShortcut } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ProviderSettings } from '@/components/providers/ProviderManager';
import {
  EnvironmentSettings,
  EnvironmentSettingsFooter,
} from '@/components/environments/EnvironmentManager';
import { useUiStore, type SettingsPage } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

type SettingsSection = {
  id: SettingsPage;
  label: string;
  icon: LucideIcon;
};

const SECTIONS: SettingsSection[] = [
  { id: 'providers', label: 'Providers', icon: Server },
  { id: 'environments', label: 'Environments', icon: Variable },
];

export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen);
  const settingsPage = useUiStore((s) => s.settingsPage);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  const handleClose = () => setSettingsOpen(false);

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
          className="!flex max-h-[82vh] min-h-0 !max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
          showCloseButton={false}
          showOverlay={false}
        >
          <div className="bg-muted/20 flex shrink-0 items-center justify-between border-b px-5 py-3">
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
              className="bg-muted/10 flex w-36 shrink-0 flex-col gap-0.5 border-r p-2"
            >
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSettingsOpen(true, id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                    settingsPage === id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {settingsPage === 'providers' && (
                <ProviderSettings onClose={handleClose} />
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
