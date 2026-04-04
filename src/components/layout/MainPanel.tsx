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
import { useResponseStore } from '@/stores/response-store';
import { useSendRequest } from '@/hooks/use-send-request';
import { useProviderStore } from '@/stores/provider-store';
import { IS_MAC } from '@/lib/platform';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TokenCountBadge } from '@/components/composer/TokenCountBadge';

export function MainPanel() {
  const isLoading = useResponseStore((s) => s.isLoading);
  const { send, cancel } = useSendRequest();
  const hasProvider = useProviderStore((s) => s.providers.length > 0);

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="border-border/70 flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4">
        <ProviderSelect />
        <div className="flex items-center gap-3">
          <TokenCountBadge />
          {isLoading ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={cancel}
            >
              <Square className="mr-1.5 h-3 w-3" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs shadow-sm"
              onClick={send}
              disabled={!hasProvider}
            >
              <Send className="mr-1.5 h-3 w-3" />
              Send
              <span className="ml-1.5 hidden items-center gap-0.5 opacity-60 sm:inline-flex">
                {(IS_MAC ? ['⌘', '↵'] : ['Ctrl', '↵']).map((k, i) => (
                  <kbd
                    key={i}
                    className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-current/25 bg-current/10 px-1 font-sans text-[9px] leading-none font-medium tracking-wide"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </Button>
          )}
        </div>
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
