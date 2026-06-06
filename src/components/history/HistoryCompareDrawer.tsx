import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiffText } from '@/components/ui/diff-text';
import type { HistoryEntry } from '@/types/history';
import { diffWords, jaccardSimilarity } from '@/utils/diff';
import { formatHistoryPrompt } from '@/utils/prompt-diff';

export function HistoryCompareDrawer({
  entries,
  onClose,
}: {
  entries: [HistoryEntry, HistoryEntry];
  onClose: () => void;
}) {
  const [entryA, entryB] = entries;

  const diff = useMemo(() => {
    const promptA = formatHistoryPrompt(entryA);
    const promptB = formatHistoryPrompt(entryB);
    return {
      segments: diffWords(promptA, promptB),
      similarity: jaccardSimilarity(promptA, promptB),
    };
  }, [entryA, entryB]);

  return (
    <div className="border-border/70 bg-background border-t">
      <div className="border-border/60 flex items-center justify-between border-b px-3 py-1.5">
        <div className="text-foreground min-w-0 text-xs font-medium">
          <span className="truncate">
            {entryA.providerName} / {entryA.modelId}
          </span>
          <span className="text-muted-foreground mx-2">vs</span>
          <span className="truncate">
            {entryB.providerName} / {entryB.modelId}
          </span>
          <span className="text-muted-foreground ml-3 text-[11px]">
            Jaccard similarity: {(diff.similarity * 100).toFixed(1)}%
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close prompt compare"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="max-h-72 overflow-auto p-3">
        <div className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
          Prompt diff
        </div>
        <DiffText segments={diff.segments} />
      </div>
    </div>
  );
}
