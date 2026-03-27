import { useState } from 'react';
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
import type { ProviderConfig } from '@/types/provider';

type View = 'list' | 'edit';

export function ProviderManager() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [resettingAll, setResettingAll] = useState(false);

  const { providers, updateProvider, resetProvider, resetAllProviders } = useProviders();

  const handleEdit = async (data: Omit<ProviderConfig, 'id'>) => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, data);
      setEditingProvider(null);
      setView('list');
    }
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={(val) => { setOpen(val); if (!val) setView('list'); }}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" />}
      >
        <Settings className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" showCloseButton={false} showOverlay={false}>
        <DialogHeader>
          <DialogTitle>
            {view === 'list' && 'Providers'}
            {view === 'edit' && 'Edit Provider'}
          </DialogTitle>
          {/* Custom close button: navigates back to list on sub-views, closes dialog on list */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2"
            onClick={() => {
              if (view === 'list') {
                setOpen(false);
              } else {
                setEditingProvider(null);
                setView('list');
              }
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        {view === 'list' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 group"
                >
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.apiKey ? 'API key configured' : 'No API key'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-xs text-destructive hover:text-destructive"
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
              <RotateCcw className="h-3 w-3 mr-1" />
              {resettingAll ? 'Resetting...' : 'Reset all to default'}
            </Button>
          </div>
        )}

        {view === 'edit' && editingProvider && (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ProviderForm
              initialData={editingProvider}
              onSubmit={handleEdit}
              onCancel={() => { setEditingProvider(null); setView('list'); }}
              submitLabel="Update"
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
