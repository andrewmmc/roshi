import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Standard 44px panel/toolbar header used across the main column (request
 * toolbar, composer tabs, response tabs) and the sidebar. Guarantees a shared
 * height, horizontal padding, and bottom border so stacked headers align.
 */
function PanelHeader({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        'border-border/70 flex h-11 shrink-0 items-center gap-2 border-b px-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { PanelHeader };
