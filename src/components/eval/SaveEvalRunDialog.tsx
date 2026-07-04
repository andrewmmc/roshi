import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EvalCollection } from '@/types/eval';

const UNGROUPED_VALUE = '__ungrouped__';

interface SaveEvalRunDialogProps {
  open: boolean;
  collections: EvalCollection[];
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, collectionId: string | null) => Promise<void>;
  onCreateCollection: (name: string) => Promise<EvalCollection>;
}

export function SaveEvalRunDialog({
  open,
  collections,
  onOpenChange,
  onSave,
  onCreateCollection,
}: SaveEvalRunDialogProps) {
  const [name, setName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>(UNGROUPED_VALUE);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setSelectedFolder(UNGROUPED_VALUE);
    setCreating(false);
    setNewFolderName('');
    setBusy(false);
  }, [open]);

  const handleCreateFolder = useCallback(async () => {
    const folderName = newFolderName.trim();
    if (!folderName) return;
    setBusy(true);
    try {
      const collection = await onCreateCollection(folderName);
      setSelectedFolder(collection.id);
      setCreating(false);
      setNewFolderName('');
    } finally {
      setBusy(false);
    }
  }, [newFolderName, onCreateCollection]);

  const handleSave = useCallback(async () => {
    setBusy(true);
    try {
      await onSave(
        name.trim(),
        selectedFolder === UNGROUPED_VALUE ? null : selectedFolder,
      );
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }, [name, onOpenChange, onSave, selectedFolder]);

  const selectedCollection = collections.find(
    (collection) => collection.id === selectedFolder,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save eval run</DialogTitle>
          <DialogDescription>
            The current prompt, runners, and results will be persisted locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional name (e.g. 'Pricing wording variants')"
              aria-label="Eval run name"
              autoFocus
            />
          </Field>

          <Field label="Folder">
            {creating ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleCreateFolder();
                    }
                  }}
                  placeholder="New folder name"
                  aria-label="New folder name"
                  autoFocus
                />
                <IconButton
                  variant="default"
                  size="icon-sm"
                  tooltip="Create folder"
                  aria-label="Create folder"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || busy}
                >
                  <Check className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  variant="ghost"
                  size="icon-sm"
                  tooltip="Cancel"
                  aria-label="Cancel new folder"
                  onClick={() => {
                    setCreating(false);
                    setNewFolderName('');
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Select
                  value={selectedFolder}
                  onValueChange={(value) =>
                    setSelectedFolder(value ?? UNGROUPED_VALUE)
                  }
                >
                  <SelectTrigger aria-label="Select folder" className="w-full">
                    <SelectValue>
                      {selectedCollection?.name ?? 'Ungrouped'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNGROUPED_VALUE}>Ungrouped</SelectItem>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreating(true);
                    setNewFolderName('');
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              </div>
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy || creating}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
