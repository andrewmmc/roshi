import { useState } from 'react';
import { Settings, Pencil, X } from 'lucide-react';
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

  const { providers, updateProvider, resetProviderModels } = useProviders();

  const handleEdit = async (data: Omit<ProviderConfig, 'id'>) => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, data);
      setEditingProvider(null);
      setView('list');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setView('list'); }}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
      >
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" showCloseButton={false}>
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
        )}

        {view === 'edit' && editingProvider && (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ProviderForm
              initialData={editingProvider}
              onSubmit={handleEdit}
              onCancel={() => { setEditingProvider(null); setView('list'); }}
              submitLabel="Update"
              isBuiltIn={editingProvider.isBuiltIn}
              onResetModels={async () => {
                await resetProviderModels(editingProvider.id);
                // Read fresh state from store after reset
                const updated = useProviderStore.getState().providers.find((p) => p.id === editingProvider.id);
                if (updated) setEditingProvider(updated);
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
