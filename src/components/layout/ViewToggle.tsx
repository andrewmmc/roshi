import { useUiStore, type MainView } from '@/stores/ui-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const VIEW_OPTIONS: MainView[] = ['request', 'eval'];

const VIEW_TOOLTIPS: Record<MainView, string> = {
  request: 'Send a single request and view the response.',
  eval: 'Run the same prompt against multiple models and compare results side by side.',
};

export function ViewToggle() {
  const view = useUiStore((s) => s.mainView);
  const setView = useUiStore((s) => s.setMainView);

  return (
    <div className="border-border/70 bg-muted/30 inline-flex h-7 items-center rounded-lg border p-0.5">
      {VIEW_OPTIONS.map((option) => (
        <TooltipProvider key={option} delay={500}>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    'rounded-sm px-2 text-xs font-medium capitalize transition-colors',
                    view === option
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                />
              }
            >
              {option}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-52">
              {VIEW_TOOLTIPS[option]}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
