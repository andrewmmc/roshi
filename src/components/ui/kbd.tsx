import * as React from 'react';

import { IS_MAC } from '@/lib/platform';
import { cn } from '@/lib/utils';

/**
 * Canonical keyboard-key affordance. Uses `currentColor` so it reads correctly
 * on any background (light tooltip surface, dark primary button, etc.).
 */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-current/25 bg-current/10 px-1 font-sans text-[10px] leading-none font-medium tracking-wide',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a platform-aware keyboard shortcut as a row of {@link Kbd} keys.
 * `mac` is split per-character (e.g. "⌘⇧N"); `win` is split on "+".
 */
function KbdShortcut({
  mac,
  win,
  className,
}: {
  mac: string;
  win: string;
  className?: string;
}) {
  const keys = IS_MAC ? [...mac] : win.split('+');
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, i) => (
        <Kbd key={i}>{key}</Kbd>
      ))}
    </span>
  );
}

export { Kbd, KbdShortcut };
