import { useUiStore, type MainView } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const VIEW_OPTIONS: MainView[] = ['request', 'eval'];

export function ViewToggle() {
  const view = useUiStore((s) => s.mainView);
  const setView = useUiStore((s) => s.setMainView);

  return (
    <div className="border-border/70 bg-muted/30 inline-flex h-7 items-center rounded-md border p-0.5">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setView(option)}
          className={cn(
            'rounded px-2 text-[11px] font-medium capitalize transition-colors',
            view === option
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
