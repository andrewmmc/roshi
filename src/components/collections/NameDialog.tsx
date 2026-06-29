import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NameDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  label: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void | Promise<void>;
}

/**
 * Small reusable prompt for naming things: creating or renaming a collection,
 * or renaming a saved request. Autofocuses and selects the input so the user
 * can type or overwrite immediately, and submits on Enter.
 */
export function NameDialog({
  open,
  title,
  description,
  label,
  placeholder,
  initialValue = '',
  submitLabel,
  onOpenChange,
  onSubmit,
}: NameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setSubmitting(false);
    }
  }, [open, initialValue]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, onOpenChange, submitting, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Field label={label} required>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={placeholder}
            aria-label={label}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!value.trim() || submitting}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
