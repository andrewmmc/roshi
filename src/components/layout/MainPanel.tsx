import { lazy, Suspense } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { RequestComposer } from '@/components/composer/RequestComposer';
import { ResponsePanel } from '@/components/response/ResponsePanel';
import { ProviderSelect } from '@/components/composer/ProviderSelect';
import { EnvironmentSelector } from '@/components/environments/EnvironmentManager';
import { EnvironmentPreviewButton } from '@/components/environments/EnvironmentPreviewSheet';
import { FirstRunChecklist } from '@/components/onboarding/FirstRunChecklist';
import { RequestCompatibilityWarning } from '@/components/composer/RequestCompatibilityWarning';
import { Button } from '@/components/ui/button';
import { GitCompare, Send, Square } from 'lucide-react';
import { useResponseStore } from '@/stores/response-store';
import { useSendRequest } from '@/hooks/use-send-request';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { useEvalStore } from '@/stores/eval-store';
import { IS_MAC } from '@/lib/platform';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TokenCountBadge } from '@/components/composer/TokenCountBadge';
import { ViewToggle } from './ViewToggle';

const EvalView = lazy(() =>
  import('@/components/eval/EvalView').then((m) => ({ default: m.EvalView })),
);

export function MainPanel() {
  const mainView = useUiStore((s) => s.mainView);

  return (
    <div className="bg-background flex h-full flex-col">
      <FirstRunChecklist />
      {mainView === 'request' ? <RequestView /> : null}
      {mainView === 'eval' ? (
        <Suspense
          fallback={
            <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
              Loading eval…
            </div>
          }
        >
          <EvalView />
        </Suspense>
      ) : null}
    </div>
  );
}

function RequestView() {
  const isLoading = useResponseStore((s) => s.isLoading);
  const { send, cancel } = useSendRequest();
  const hasProvider = useProviderStore((s) => s.providers.length > 0);
  const setMainView = useUiStore((s) => s.setMainView);
  const seedFromMainComposer = useEvalStore((s) => s.seedFromMainComposer);

  const handleComparePrompt = () => {
    seedFromMainComposer();
    setMainView('eval');
  };

  return (
    <>
      <div className="border-border/70 flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <ViewToggle />
          <ProviderSelect />
          <EnvironmentSelector />
          <EnvironmentPreviewButton />
        </div>
        <div className="flex items-center gap-3">
          <TokenCountBadge />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden h-7 text-xs sm:inline-flex"
            onClick={handleComparePrompt}
            title="Compare this prompt across models"
          >
            <GitCompare className="mr-1.5 h-3 w-3" />
            Compare
          </Button>
          {isLoading ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={cancel}
            >
              <Square className="mr-1.5 h-3 w-3" />
              Stop
              <kbd className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-current/25 bg-current/10 px-1 font-sans text-[9px] leading-none font-medium tracking-wide opacity-60">
                Esc
              </kbd>
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
      <div className="border-border/70 shrink-0 border-b px-4 py-2">
        <RequestCompatibilityWarning />
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
    </>
  );
}
