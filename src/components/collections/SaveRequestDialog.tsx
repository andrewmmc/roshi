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
  const { t } = useTranslation();
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
          <DialogTitle>{t('collections.saveRequest')}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('collections.editDescription')
              : t('collections.saveDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label={t('collections.requestName')} required>
            <Input
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder={t('collections.requestNamePlaceholder')}
              aria-label={t('collections.requestName')}
              autoFocus
            />
          </Field>

          <Field label={t('collections.folder')}>
            <Select
              value={selectedCollectionId}
              onValueChange={(value) =>
                setSelectedCollectionId(value ?? UNGROUPED_VALUE)
              }
            >
              <SelectTrigger
                aria-label={t('collections.selectFolder')}
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
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleSaveNew}
                disabled={saveDisabled}
              >
                {t('collections.saveAsNew')}
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={busy || !requestName.trim()}
              >
                {t('common.update')}
              </Button>
            </>
          ) : (
            <Button onClick={handleSaveNew} disabled={saveDisabled}>
              {t('collections.saveRequest')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
