import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { RequestComposer } from '@/components/composer/RequestComposer';
import { ResponsePanel } from '@/components/response/ResponsePanel';
import { ProviderSelect } from '@/components/composer/ProviderSelect';
import { Button } from '@/components/ui/button';
import { Send, Square } from 'lucide-react';
import { useRequestStore } from '@/stores/request-store';
import { useSendRequest } from '@/hooks/use-send-request';
import { useProviderStore } from '@/stores/provider-store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function MainPanel() {
  const isLoading = useRequestStore((s) => s.isLoading);
  const { send, cancel } = useSendRequest();
  const hasProvider = useProviderStore((s) => s.providers.length > 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isLoading && hasProvider) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between gap-3 px-4 h-11 border-b shrink-0">
        <ProviderSelect />
        {isLoading ? (
          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={cancel}>
            <Square className="h-3 w-3 mr-1.5" />
            Stop
          </Button>
        ) : (
          <Button size="sm" className="h-7 text-xs" onClick={send} disabled={!hasProvider}>
            <Send className="h-3 w-3 mr-1.5" />
            Send
            <kbd className="ml-1.5 text-[10px] opacity-50 hidden sm:inline">⌘↵</kbd>
          </Button>
        )}
      </div>
      <ResizablePanelGroup orientation="vertical" className="flex-1">
        <ResizablePanel defaultSize="40%" minSize="20%">
          <ErrorBoundary panel>
            <RequestComposer />
          </ErrorBoundary>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="60%" minSize="20%">
          <ErrorBoundary panel>
            <ResponsePanel />
          </ErrorBoundary>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
