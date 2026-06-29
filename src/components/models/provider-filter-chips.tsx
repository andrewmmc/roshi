import { cn } from '@/lib/utils';
import type { ProviderConfig } from '@/types/provider';

export function ProviderFilterChips({
  providers,
  activeProviderId,
  onChange,
}: {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={activeProviderId === null}
        className={cn(
          'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
          activeProviderId === null
            ? 'border-foreground/20 bg-foreground/5 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground',
        )}
      >
        All
      </button>
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          aria-pressed={activeProviderId === p.id}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
            activeProviderId === p.id
              ? 'border-foreground/20 bg-foreground/5 text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
