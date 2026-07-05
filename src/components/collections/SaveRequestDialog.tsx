import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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

const UNGROUPED_VALUE = '__ungrouped__';

interface SaveRequestDialogProps {
  open: boolean;
  collections: Collection[];
  activeSavedRequest: SavedRequest | null;
  onOpenChange: (open: boolean) => void;
  onSaveRequest: (collectionId: string | null, name: string) => Promise<void>;
  onUpdateRequest: (name: string) => Promise<void>;
}

export function SaveRequestDialog({
  open,
  collections,
  activeSavedRequest,
  onOpenChange,
  onSaveRequest,
  onUpdateRequest,
}: SaveRequestDialogProps) {
  const [requestName, setRequestName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] =
    useState(UNGROUPED_VALUE);
  const [busy, setBusy] = useState(false);

  const isEditing = Boolean(activeSavedRequest);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    if (activeSavedRequest) {
      setRequestName(activeSavedRequest.name);
      setSelectedCollectionId(
        activeSavedRequest.collectionId ?? UNGROUPED_VALUE,
      );
    } else {
      setRequestName('');
      setSelectedCollectionId(UNGROUPED_VALUE);
    }
  }, [open, activeSavedRequest, collections]);

  const handleSaveNew = useCallback(async () => {
    if (!requestName.trim()) return;
    setBusy(true);
    try {
      await onSaveRequest(
        selectedCollectionId === UNGROUPED_VALUE ? null : selectedCollectionId,
        requestName,
      );
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
  const saveDisabled = busy || !requestName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save request</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this saved request with the current composer, or save it as a new request.'
              : 'Store the current composer in a folder so it can be reused later.'}
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

          <Field label="Folder">
            <Select
              value={selectedCollectionId}
              onValueChange={(value) =>
                setSelectedCollectionId(value ?? UNGROUPED_VALUE)
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
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isEditing ? (
            <>
              <Button
                variant="outline"
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
