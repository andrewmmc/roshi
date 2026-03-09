import { useState } from 'react';
import { Settings, Plus, Trash2, Pencil, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProviderForm } from './ProviderForm';
import { useProviders } from '@/hooks/use-providers';
import { builtinProviders } from '@/providers/builtins';
import type { ProviderConfig } from '@/types/provider';

type View = 'list' | 'add' | 'edit' | 'import';

export function ProviderManager() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [importApiKey, setImportApiKey] = useState('');
  const [importIndex, setImportIndex] = useState<number | null>(null);

  const { providers, addProvider, updateProvider, deleteProvider, importBuiltin } = useProviders();

  const handleAdd = async (data: Omit<ProviderConfig, 'id'>) => {
    await addProvider(data);
    setView('list');
  };

  const handleEdit = async (data: Omit<ProviderConfig, 'id'>) => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, data);
      setEditingProvider(null);
      setView('list');
    }
  };

  const handleImport = async () => {
    if (importIndex !== null) {
      await importBuiltin(importIndex, importApiKey);
      setImportApiKey('');
      setImportIndex(null);
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
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {view === 'list' && 'Providers'}
            {view === 'add' && 'Add Provider'}
            {view === 'edit' && 'Edit Provider'}
            {view === 'import' && 'Import Provider'}
          </DialogTitle>
        </DialogHeader>

        {view === 'list' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setView('add')}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Custom Provider
              </Button>
              <Button size="sm" variant="outline" onClick={() => setView('import')}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Import Template
              </Button>
            </div>

            <ScrollArea className="max-h-[50vh]">
              <div className="flex flex-col gap-1">
                {providers.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No providers configured. Add one or import a template.
                  </p>
                )}
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 group"
                  >
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.baseUrl}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingProvider(p);
                          setView('edit');
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteProvider(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {view === 'add' && (
          <ScrollArea className="max-h-[60vh]">
            <ProviderForm onSubmit={handleAdd} onCancel={() => setView('list')} submitLabel="Add" />
          </ScrollArea>
        )}

        {view === 'edit' && editingProvider && (
          <ScrollArea className="max-h-[60vh]">
            <ProviderForm
              initialData={editingProvider}
              onSubmit={handleEdit}
              onCancel={() => { setEditingProvider(null); setView('list'); }}
              submitLabel="Update"
            />
          </ScrollArea>
        )}

        {view === 'import' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Choose a built-in provider template and enter your API key.
            </p>
            <div className="flex flex-col gap-1">
              {builtinProviders.map((bp, index) => {
                const alreadyImported = providers.some(
                  (p) => p.name === bp.name && p.isBuiltIn,
                );
                return (
                  <button
                    key={index}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                      importIndex === index
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50'
                    } ${alreadyImported ? 'opacity-50' : ''}`}
                    onClick={() => setImportIndex(index)}
                    disabled={alreadyImported}
                  >
                    <div>
                      <div className="text-sm font-medium">{bp.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {bp.baseUrl} · {bp.models.length} models
                      </div>
                    </div>
                    {alreadyImported && (
                      <span className="text-xs text-muted-foreground">Already added</span>
                    )}
                  </button>
                );
              })}
            </div>
            {importIndex !== null && (
              <div className="flex flex-col gap-2 pt-2 border-t">
                <label className="text-xs font-medium text-muted-foreground">
                  API Key for {builtinProviders[importIndex].name}
                </label>
                <input
                  type="password"
                  value={importApiKey}
                  onChange={(e) => setImportApiKey(e.target.value)}
                  placeholder="Enter API key..."
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setView('list')}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleImport} disabled={!importApiKey.trim()}>
                    Import
                  </Button>
                </div>
              </div>
            )}
            {importIndex === null && (
              <Button variant="outline" size="sm" className="self-start" onClick={() => setView('list')}>
                Back
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
