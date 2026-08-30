import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useUiStore, type MainView } from '@/stores/ui-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { loadEvalView } from './lazy-view-loaders';
import { useTranslation, type MessageKey } from '@/i18n';

const VIEW_OPTIONS: MainView[] = ['request', 'eval'];

const VIEW_TOOLTIPS: Record<MainView, MessageKey> = {
  request: 'navigation.requestViewDescription',
  eval: 'navigation.evalViewDescription',
};

export function ViewToggle() {
  const { t } = useTranslation();
  const view = useUiStore((s) => s.mainView);
  const setView = useUiStore((s) => s.setMainView);
  const [pendingView, setPendingView] = useState<MainView | null>(null);

  const preloadView = (option: MainView) => {
    if (option === 'eval') {
      void loadEvalView().catch(() => undefined);
    }
  };

  const selectView = async (option: MainView) => {
    if (option === view || pendingView) return;

    if (option === 'eval') {
      setPendingView(option);
      await loadEvalView().catch(() => undefined);
      setPendingView(null);
    }

    setView(option);
  };

  return (
    <div className="border-border/70 bg-muted/30 inline-flex h-8 items-center rounded-lg border p-0.5">
      {VIEW_OPTIONS.map((option) => (
        <TooltipProvider key={option} delay={500}>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-pressed={view === option}
                  aria-busy={pendingView === option || undefined}
                  disabled={pendingView !== null}
                  onPointerEnter={() => preloadView(option)}
                  onFocus={() => preloadView(option)}
                  onClick={() => void selectView(option)}
                  className={cn(
                    'inline-flex h-6 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-[13px] font-medium capitalize transition-colors',
                    view === option
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                />
              }
            >
              {t(`navigation.${option}`)}
              {pendingView === option && (
                <LoaderCircle
                  className="h-3 w-3 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-52">
              {t(VIEW_TOOLTIPS[option])}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
