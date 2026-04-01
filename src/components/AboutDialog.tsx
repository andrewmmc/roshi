import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';

export function AboutDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unlisten = listen('show-about', () => {
      setOpen(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

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
            <a
              href="https://github.com/andrewmmc/roshi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary block hover:underline"
            >
              GitHub: https://github.com/andrewmmc/roshi
            </a>
            <a
              href="https://github.com/andrewmmc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary block hover:underline"
            >
              Author: https://github.com/andrewmmc
            </a>
          </div>
          <p className="text-muted-foreground text-xs">© 2026 Andrew Mok</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
