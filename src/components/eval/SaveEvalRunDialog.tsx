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
import { useTranslation } from '@/i18n';
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
  const { t } = useTranslation();
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
          <DialogTitle>{t('eval.saveDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('eval.saveDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label={t('common.name')}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('eval.runNamePlaceholder')}
              aria-label={t('eval.runNameAria')}
              autoFocus
            />
          </Field>

          <Field label={t('eval.folderLabel')}>
            <Select
              value={selectedFolder}
              onValueChange={(value) =>
                setSelectedFolder(value ?? UNGROUPED_VALUE)
              }
            >
              <SelectTrigger
                aria-label={t('eval.selectFolderAria')}
                className="w-full"
              >
                <SelectValue>
                  {selectedCollection?.name ?? t('collections.ungrouped')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNGROUPED_VALUE}>
                  {t('collections.ungrouped')}
                </SelectItem>
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
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
