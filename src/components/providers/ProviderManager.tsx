import { useState, useRef } from 'react';
import { Settings, Pencil, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProviderForm } from './ProviderForm';
import { useProviders } from '@/hooks/use-providers';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { builtinProviders } from '@/providers/builtins';
import { IS_MAC } from '@/lib/platform';
import type { ProviderConfig } from '@/types/provider';

type View = 'list' | 'edit';

function getProviderDetails(provider: ProviderConfig): string {
  const builtin = builtinProviders.find((b) => b.name === provider.name);
  const hasApiKey = Boolean(provider.apiKey);
  const hasCustomHeaders = Object.keys(provider.customHeaders ?? {}).length > 0;
  const hasCustomEndpoint =
    builtin && provider.endpoints.chat !== builtin.endpoints.chat;
  const hasCustomBaseUrl = builtin && provider.baseUrl !== builtin.baseUrl;

  return [
    hasApiKey ? 'API key configured' : 'No API key',
    hasCustomHeaders && 'Custom headers',
    hasCustomEndpoint && 'Custom endpoint',
    hasCustomBaseUrl && 'Custom base URL',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function ProviderManager() {
  const open = useUiStore((s) => s.providerSettingsOpen);
  const setOpen = useUiStore((s) => s.setProviderSettingsOpen);
  const [view, setView] = useState<View>('list');
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null,
  );
  const [resettingAll, setResettingAll] = useState(false);
  const [resettingProvider, setResettingProvider] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const { providers, updateProvider, resetProvider, resetAllProviders } =
    useProviders();

  const handleEdit = async (data: Omit<ProviderConfig, 'id'>) => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, data);
      setEditingProvider(null);
      setView('list');
    }
  };

  const handleClose = () => {
    setEditingProvider(null);
    setView('list');
    setOpen(false);
  };

  const handleBackToList = () => {
    setEditingProvider(null);
    setView('list');
  };

  return (
    <Dialog
      modal={false}
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setView('list');
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-7 w-7"
                    aria-label="Provider settings"
                  />
                }
              />
            }
          >
            <Settings className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent>
            <span className="flex items-center gap-1.5">
              Provider settings
              <kbd className="opacity-60">
                {IS_MAC ? '⌘⇧,' : 'Ctrl+Shift+,'}
              </kbd>
            </span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent
        className="!flex max-h-[82vh] min-h-0 !max-w-xl flex-col gap-0 overflow-hidden p-0"
        showCloseButton={false}
        showOverlay={false}
      >
        {/* Header */}
        <DialogHeader className="bg-muted/20 relative shrink-0 border-b px-5 py-4 pr-14">
          <DialogTitle className="text-[15px] tracking-tight">
            {view === 'list' && 'Providers'}
            {view === 'edit' && 'Edit Provider'}
          </DialogTitle>
          <p className="text-muted-foreground text-xs">
            {view === 'list' &&
              'Tune credentials and model options for each connected provider.'}
            {view === 'edit' &&
              'Update keys, headers, endpoints, and model entries without leaving the composer.'}
          </p>
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3"
            onClick={() => {
              if (view === 'list') {
                handleClose();
              } else {
                handleBackToList();
              }
            }}
            tooltip={view === 'list' ? 'Close' : 'Back to provider list'}
          >
            <X className="h-4 w-4" />
          </IconButton>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === 'list' && (
            <div className="flex flex-col gap-2 px-3 py-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="border-border/60 bg-background/80 hover:border-foreground/15 hover:bg-muted/30 flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors"
                  onClick={() => {
                    setEditingProvider(p);
                    setView('edit');
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium tracking-tight">
                      {p.name}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {getProviderDetails(p)}
                    </div>
                  </div>
                  <Pencil
                    className="text-muted-foreground h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          )}

          {view === 'edit' && editingProvider && (
            <ProviderForm
              key={`${editingProvider.id}-${formVersion}`}
              ref={formRef}
              initialData={editingProvider}
              onSubmit={handleEdit}
              isBuiltIn={editingProvider.isBuiltIn}
              onReset={async () => {
                await resetProvider(editingProvider.id);
                const updated = useProviderStore
                  .getState()
                  .providers.find((p) => p.id === editingProvider.id);
                if (!updated) return null;
                setEditingProvider(updated);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...data } = updated;
                return data;
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/15 flex shrink-0 items-center justify-between border-t px-5 py-4">
          {view === 'list' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive text-xs"
                disabled={resettingAll}
                onClick={async () => {
                  setResettingAll(true);
                  try {
                    await resetAllProviders();
                  } finally {
                    setResettingAll(false);
                  }
                }}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                {resettingAll ? 'Resetting...' : 'Reset all to default'}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
            </>
          )}

          {view === 'edit' && editingProvider && (
            <>
              <div>
                {editingProvider.isBuiltIn && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive text-xs"
                    disabled={resettingProvider}
                    onClick={async () => {
                      setResettingProvider(true);
                      try {
                        await resetProvider(editingProvider.id);
                        const updated = useProviderStore
                          .getState()
                          .providers.find((p) => p.id === editingProvider.id);
                        if (updated) {
                          setEditingProvider(updated);
                          setFormVersion((v) => v + 1);
                        }
                      } finally {
                        setResettingProvider(false);
                      }
                    }}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    {resettingProvider ? 'Resetting...' : 'Reset to default'}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToList}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  Update
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
