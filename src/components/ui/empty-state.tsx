import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Shared empty / placeholder state for panels, lists, and response views.
 * Centers an optional icon, a primary message, an optional secondary line, and
 * an optional row of actions (typically `Button`s).
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  compact = false,
  ...props
}: React.ComponentProps<'div'> & {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Tighter vertical rhythm for narrow sidebar lists. */
  compact?: boolean;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'px-3 py-8' : 'h-full px-6',
        className,
      )}
      {...props}
    >
      {Icon && (
        <Icon className="text-muted-foreground/60 h-6 w-6" aria-hidden="true" />
      )}
      <div className="flex flex-col gap-1">
        <p className="text-foreground/90 text-[13px] font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export { EmptyState };
