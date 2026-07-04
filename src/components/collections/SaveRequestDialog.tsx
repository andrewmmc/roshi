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
import type { Collection, SavedRequest } from '@/types/history';

interface SaveRequestDialogProps {
  open: boolean;
  collections: Collection[];
  activeSavedRequest: SavedRequest | null;
  onOpenChange: (open: boolean) => void;
  onSaveRequest: (collectionId: string, name: string) => Promise<void>;
  onUpdateRequest: (name: string) => Promise<void>;
  onCreateCollection: (name: string) => Promise<Collection>;
}

export function SaveRequestDialog({
  open,
  collections,
  activeSavedRequest,
  onOpenChange,
  onSaveRequest,
  onUpdateRequest,
  onCreateCollection,
}: SaveRequestDialogProps) {
  const [requestName, setRequestName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [busy, setBusy] = useState(false);

  const isEditing = Boolean(activeSavedRequest);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setNewCollectionName('');
    if (activeSavedRequest) {
      setRequestName(activeSavedRequest.name);
      setSelectedCollectionId(
        activeSavedRequest.collectionId ?? collections[0]?.id ?? '',
      );
      setCreating(false);
    } else {
      setRequestName('');
      setSelectedCollectionId(collections[0]?.id ?? '');
      setCreating(collections.length === 0);
    }
  }, [open, activeSavedRequest, collections]);

  const handleCreateCollection = useCallback(async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const collection = await onCreateCollection(name);
      setSelectedCollectionId(collection.id);
      setCreating(false);
      setNewCollectionName('');
    } finally {
      setBusy(false);
    }
  }, [newCollectionName, onCreateCollection]);

  const handleSaveNew = useCallback(async () => {
    if (!selectedCollectionId || !requestName.trim()) return;
    setBusy(true);
    try {
      await onSaveRequest(selectedCollectionId, requestName);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }, [onOpenChange, onSaveRequest, requestName, selectedCollectionId]);

  const handleUpdate = useCallback(async () => {
    if (!requestName.trim()) return;
    setBusy(true);
    try {
      await onUpdateRequest(requestName);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }, [onOpenChange, onUpdateRequest, requestName]);

  const selectedCollection = collections.find(
    (collection) => collection.id === selectedCollectionId,
  );
  const saveDisabled =
    busy || creating || !selectedCollectionId || !requestName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save request</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this saved request with the current composer, or save it as a new request.'
              : 'Store the current composer in a collection so it can be reused later.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Request name" required>
            <Input
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="Summarize customer support prompt"
              aria-label="Request name"
              autoFocus
            />
          </Field>

          <Field label="Collection">
            {creating ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleCreateCollection();
                    }
                  }}
                  placeholder="New collection name"
                  aria-label="New collection name"
                  autoFocus
                />
                <IconButton
                  variant="default"
                  size="icon-sm"
                  tooltip="Create collection"
                  aria-label="Create collection"
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || busy}
                >
                  <Check className="h-3.5 w-3.5" />
                </IconButton>
                {collections.length > 0 && (
                  <IconButton
                    variant="ghost"
                    size="icon-sm"
                    tooltip="Cancel"
                    aria-label="Cancel new collection"
                    onClick={() => {
                      setCreating(false);
                      setNewCollectionName('');
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </IconButton>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Select
                  value={selectedCollectionId}
                  onValueChange={(value) =>
                    setSelectedCollectionId(value ?? '')
                  }
                >
                  <SelectTrigger
                    aria-label="Select collection"
                    className="w-full"
                  >
                    <SelectValue>
                      {selectedCollection?.name ?? 'Select a collection'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
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
                    setNewCollectionName('');
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
          {isEditing ? (
            <>
              <Button
                variant="secondary"
                onClick={handleSaveNew}
                disabled={saveDisabled}
              >
                Save as new
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={busy || !requestName.trim()}
              >
                Update
              </Button>
            </>
          ) : (
            <Button onClick={handleSaveNew} disabled={saveDisabled}>
              Save request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
