import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Shared sidebar list row. Renders a clickable region plus an always
 * focus-reachable actions cluster (revealed on hover/focus, but kept in tab
 * order for keyboard users). Avoids nested-button invalid markup by using a
 * non-button container with an inner action button.
 */
function SidebarRow({
  active = false,
  actions,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  active?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div
      data-slot="sidebar-row"
      data-active={active || undefined}
      className={cn(
        'group/row relative flex w-full items-center rounded-md',
        'hover:bg-sidebar-accent/70 data-active:bg-sidebar-accent',
        className,
      )}
    >
      <button
        type="button"
        className="focus-visible:ring-ring flex min-w-0 flex-1 cursor-pointer items-center px-2 py-1.5 text-left focus-visible:ring-1 focus-visible:outline-none"
        {...props}
      >
        {children}
      </button>
      {actions && (
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

export { SidebarRow };
