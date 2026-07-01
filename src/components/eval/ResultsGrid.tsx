import { Download, FileDown, FlaskConical } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { PanelHeader } from '@/components/ui/panel-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useEvalStore } from '@/stores/eval-store';
import { exportEvalRunJson, exportEvalRunCsv } from '@/utils/export';
import { emptyResult } from '@/types/eval';
import { ResultCard } from './ResultCard';

export function ResultsGrid() {
  const runners = useEvalStore((s) => s.runners);
  const results = useEvalStore((s) => s.results);
  const judgeResult = useEvalStore((s) => s.judgeResult);
  const buildRecord = useEvalStore((s) => s.buildRecord);
  const isRunning = useEvalStore((s) => s.isRunning);

  const exportDisabled = isRunning || runners.length === 0;

  const handleExportJson = () => {
    exportEvalRunJson(buildRecord());
  };

  const handleExportCsv = () => {
    exportEvalRunCsv(buildRecord());
  };

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
    <div className="flex h-full flex-col">
      <PanelHeader className="justify-between">
        <span className="text-muted-foreground text-xs font-medium">
          Results
        </span>
        <div className="flex items-center gap-1">
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            tooltip="Export run as JSON"
            onClick={handleExportJson}
            disabled={exportDisabled}
          >
            <FileDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            tooltip="Export metrics as CSV"
            onClick={handleExportCsv}
            disabled={exportDisabled}
          >
            <Download className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </PanelHeader>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
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
    </div>
  );
}
