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
import type { EvalCollection } from '@/types/eval';

const UNGROUPED_VALUE = '__ungrouped__';

interface SaveEvalRunDialogProps {
  open: boolean;
  collections: EvalCollection[];
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, collectionId: string | null) => Promise<void>;
}

export function SaveEvalRunDialog({
  open,
  collections,
  onOpenChange,
  onSave,
}: SaveEvalRunDialogProps) {
  const [name, setName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>(UNGROUPED_VALUE);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setSelectedFolder(UNGROUPED_VALUE);
    setBusy(false);
  }, [open]);

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
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
