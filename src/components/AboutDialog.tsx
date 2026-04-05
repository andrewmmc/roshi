import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { useUiStore } from '@/stores/ui-store';

export function AboutDialog() {
  const open = useUiStore((s) => s.aboutOpen);
  const setOpen = useUiStore((s) => s.setAboutOpen);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen('show-about', () => setOpen(true)))
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {
        /* not running in Tauri */
      });
    return () => unlisten?.();
  }, [setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About Roshi</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>
            <strong>Roshi v1.0.0</strong>
          </p>
          <p>MIT-licensed local-first workbench for testing LLM APIs</p>
          <div className="space-y-2">
            <p>
              GitHub:{' '}
              <a
                href="https://github.com/andrewmmc/roshi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://github.com/andrewmmc/roshi
              </a>
            </p>
            <p>
              Author:{' '}
              <a
                href="https://github.com/andrewmmc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://github.com/andrewmmc
              </a>
            </p>
            <a
              href="https://github.com/andrewmmc/roshi/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary block hover:underline"
            >
              Check for Updates...
            </a>
          </div>
          <p className="text-muted-foreground text-xs">© 2026 Andrew Mok</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
