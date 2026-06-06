import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProviderModel } from '@/types/provider';

function formatContextTokens(tokens?: number): string | null {
  if (!tokens) return null;
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M ctx`;
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K ctx`;
  }
  return `${tokens} ctx`;
}

function ModelCapabilityBadges({ model }: { model: ProviderModel }) {
  const context = formatContextTokens(model.capabilities?.tokenLimits?.context);
  const modalities = model.capabilities?.inputModalities ?? [];
  const nonTextModalities = modalities.filter((m) => m !== 'text');
  return (
    <div className="flex flex-wrap items-center gap-1">
      {context && (
        <Badge variant="outline" className="text-[10px]">
          {context}
        </Badge>
      )}
      {nonTextModalities.map((m) => (
        <Badge key={m} variant="ghost" className="text-[10px] capitalize">
          {m}
        </Badge>
      ))}
    </div>
  );
}

export function CatalogRow({
  model,
  added,
  busy,
  onAdd,
  onRemove,
}: {
  model: ProviderModel;
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="border-border/60 bg-background/80 flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium tracking-tight">
            {model.displayName || model.name || model.id}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <code className="text-muted-foreground truncate font-mono text-[11px]">
            {model.id}
          </code>
        </div>
        <div className="mt-1.5">
          <ModelCapabilityBadges model={model} />
        </div>
      </div>
      <div className="shrink-0">
        {added ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy}
            onClick={onRemove}
            aria-label={`Remove ${model.displayName || model.id}`}
          >
            <Check className="h-3 w-3" />
            Added
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy}
            onClick={onAdd}
            aria-label={`Add ${model.displayName || model.id}`}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}
