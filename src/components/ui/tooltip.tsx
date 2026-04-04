'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { IS_MAC } from '@/lib/platform';
import { cn } from '@/lib/utils';

function TooltipProvider({
  delay = 700,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = 'top',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'border-border bg-background text-foreground data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 **:data-[slot=kbd]:border-foreground/15 **:data-[slot=kbd]:bg-foreground/8 z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:inline-flex **:data-[slot=kbd]:h-5 **:data-[slot=kbd]:min-w-5 **:data-[slot=kbd]:items-center **:data-[slot=kbd]:justify-center **:data-[slot=kbd]:rounded **:data-[slot=kbd]:border **:data-[slot=kbd]:px-1 **:data-[slot=kbd]:font-sans **:data-[slot=kbd]:text-[10px] **:data-[slot=kbd]:leading-none **:data-[slot=kbd]:font-medium **:data-[slot=kbd]:tracking-wide **:data-[slot=kbd]:shadow-xs',
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

function KbdShortcut({ mac, win }: { mac: string; win: string }) {
  const keys = IS_MAC ? [...mac] : win.split('+');
  return (
    <span className="ml-0.5 flex items-center gap-0.5">
      {keys.map((key, i) => (
        <kbd key={i} data-slot="kbd">
          {key}
        </kbd>
      ))}
    </span>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  KbdShortcut,
};
