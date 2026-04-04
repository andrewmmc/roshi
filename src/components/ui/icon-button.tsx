import type { ComponentProps, ReactNode } from 'react';
import type { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type IconButtonProps = ComponentProps<typeof Button> & {
  tooltip: ReactNode;
  tooltipSide?: TooltipPrimitive.Positioner.Props['side'];
};

function IconButton({
  tooltip,
  tooltipSide = 'top',
  children,
  ...buttonProps
}: IconButtonProps) {
  const fallbackAriaLabel = typeof tooltip === 'string' ? tooltip : undefined;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<Button aria-label={fallbackAriaLabel} {...buttonProps} />}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { IconButton };
export type { IconButtonProps };
