import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
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
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-2">
            <img
              src="/favicon-192.png"
              alt="Roshi"
              className="h-16 w-16 rounded-xl"
            />
            <div className="text-center">
              <p className="text-sm font-semibold">Roshi</p>
              <p className="text-muted-foreground text-xs">
                v{__APP_VERSION__} ({__APP_COMMIT__})
              </p>
            </div>
          </div>

          <Separator />

          <p className="text-muted-foreground text-center text-sm">
            MIT-licensed local-first workbench for testing LLM APIs
          </p>

          <Separator />

          <div className="space-y-2">
            <a
              href="https://github.com/andrewmmc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary flex items-center gap-2 text-sm transition-colors"
            >
              <ExternalLink className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              Author
            </a>
            <a
              href="https://github.com/andrewmmc/roshi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary flex items-center gap-2 text-sm transition-colors"
            >
              <ExternalLink className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              GitHub
            </a>
            <a
              href="https://roshi.mmc.dev/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary flex items-center gap-2 text-sm transition-colors"
            >
              <ExternalLink className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              Privacy Policy
            </a>
          </div>

          <p className="text-muted-foreground text-xs">© 2026 Andrew Mok</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
