import { FlaskConical } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useEvalStore } from '@/stores/eval-store';
import { emptyResult } from '@/types/eval';
import { ResultCard } from './ResultCard';

export function ResultsGrid() {
  const runners = useEvalStore((s) => s.runners);
  const results = useEvalStore((s) => s.results);
  const judgeResult = useEvalStore((s) => s.judgeResult);

  if (runners.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="Add at least one runner to start evaluating."
        description="Pick a provider + model in the Runners tab, then run the eval to compare results here."
      />
    );
  }

  return (
    <div className="h-full min-h-0 flex-1 overflow-auto px-3 py-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {runners.map((runner) => {
          const result = results[runner.id] ?? emptyResult(runner.id);
          return (
            <div key={runner.id} className="flex h-[420px] min-h-0">
              <ResultCard
                runner={runner}
                result={result}
                judgeResult={judgeResult}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
