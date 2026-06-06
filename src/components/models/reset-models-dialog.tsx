import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ResetModelsDialog({
  open,
  resetting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  resetting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset all model picks?</DialogTitle>
          <DialogDescription>
            This clears your model picks for every built-in provider. Custom
            provider models are not affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={resetting}
            onClick={() => {
              onConfirm();
            }}
          >
            {resetting ? 'Resetting…' : 'Reset all'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
