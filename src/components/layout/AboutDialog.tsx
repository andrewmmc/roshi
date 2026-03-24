import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="max-w-xs">
        <DialogHeader>
          <DialogTitle>LLM Tester</DialogTitle>
          <DialogDescription>Version pre-1.0.0</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          A tool for testing and comparing large language model responses across providers.
        </p>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
