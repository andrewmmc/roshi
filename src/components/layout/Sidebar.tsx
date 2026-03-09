import { FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderManager } from '@/components/providers/ProviderManager';
import { HistoryList } from '@/components/history/HistoryList';
import { useRequestStore } from '@/stores/request-store';

export function Sidebar() {
  const reset = useRequestStore((s) => s.reset);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-semibold tracking-tight">LLM Tester</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset} title="New request">
            <FilePlus2 className="h-4 w-4" />
          </Button>
          <ProviderManager />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <HistoryList />
      </div>
    </div>
  );
}
