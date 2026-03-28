import { useState, useRef } from 'react';
import { Settings, Pencil, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { builtinProviders } from '@/providers/builtins';
import type { ProviderConfig } from '@/types/provider';

type View = 'list' | 'edit';

function getProviderDetails(provider: ProviderConfig): string {
  const builtin = builtinProviders.find((b) => b.name === provider.name);
  const hasApiKey = Boolean(provider.apiKey);
  const hasCustomHeaders = Object.keys(provider.customHeaders ?? {}).length > 0;
  const hasCustomEndpoint = builtin && provider.endpoints.chat !== builtin.endpoints.chat;
  const hasCustomBaseUrl = builtin && provider.baseUrl !== builtin.baseUrl;

  return [
    hasApiKey ? 'API key configured' : 'No API key',
    hasCustomHeaders && 'Custom headers',
    hasCustomEndpoint && 'Custom endpoint',
    hasCustomBaseUrl && 'Custom base URL',
  ].filter(Boolean).join(' · ');
}

export function ProviderManager() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [resettingProvider, setResettingProvider] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const { providers, updateProvider, resetProvider, resetAllProviders } = useProviders();

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
    <Dialog modal={false} open={open} onOpenChange={(val) => { setOpen(val); if (!val) setView('list'); }}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" />}
      >
        <Settings className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-h-[82vh] !max-w-xl !flex min-h-0 flex-col gap-0 overflow-hidden p-0" showCloseButton={false} showOverlay={false}>
        {/* Header */}
        <DialogHeader className="relative shrink-0 border-b bg-muted/20 px-5 py-4 pr-14">
          <DialogTitle className="text-[15px] tracking-tight">
            {view === 'list' && 'Providers'}
            {view === 'edit' && 'Edit Provider'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {view === 'list' && 'Tune credentials and model options for each connected provider.'}
            {view === 'edit' && 'Update keys, headers, endpoints, and model entries without leaving the composer.'}
          </p>
          <Button
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
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === 'list' && (
            <div className="flex flex-col gap-2 px-3 py-3">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-4 py-3 transition-colors hover:border-foreground/15 hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium tracking-tight">{p.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {getProviderDetails(p)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground opacity-70 transition hover:text-foreground group-hover:opacity-100"
                    onClick={() => {
                      setEditingProvider(p);
                      setView('edit');
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {view === 'edit' && editingProvider && (
            <ProviderForm
              key={editingProvider.id}
              ref={formRef}
              initialData={editingProvider}
              onSubmit={handleEdit}
              isBuiltIn={editingProvider.isBuiltIn}
              onReset={async () => {
                await resetProvider(editingProvider.id);
                const updated = useProviderStore.getState().providers.find((p) => p.id === editingProvider.id);
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
        <div className="flex shrink-0 items-center justify-between border-t bg-muted/15 px-5 py-4">
          {view === 'list' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
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
                    className="text-xs text-destructive hover:text-destructive"
                    disabled={resettingProvider}
                    onClick={async () => {
                      setResettingProvider(true);
                      try {
                        await resetProvider(editingProvider.id);
                        const updated = useProviderStore.getState().providers.find((p) => p.id === editingProvider.id);
                        if (updated) setEditingProvider(updated);
                      } finally {
                        setResettingProvider(false);
                      }
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {resettingProvider ? 'Resetting...' : 'Reset to default'}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleBackToList}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => formRef.current?.requestSubmit()}>
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
