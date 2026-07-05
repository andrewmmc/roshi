import { useRef, useEffect, useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import {
  useTabStore,
  computeTabLabel,
  tabHasStoredWork,
} from '@/stores/tab-store';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { cn } from '@/lib/utils';

/**
 * Horizontal tab bar shown above the request toolbar.
 * Only rendered when there are 2+ tabs, or always (collapsed to height-0)
 * when there is 1 tab so that the single-tab affordance never flashes.
 */
export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const switchTab = useTabStore((s) => s.switchTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const createTab = useTabStore((s) => s.createTab);

  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);

  // Derive the active tab's label live from the composer store so it stays
  // current while the user types (inactive tabs use their stored label).
  const activeMessages = useComposerStore((s) => s.messages);
  const liveActiveLabel = computeTabLabel(activeMessages);

  // Scroll the active tab button into view whenever it changes.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current?.querySelector(
      '[data-active-tab]',
    ) as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  const canClose = tabs.length > 1;

  const tabWouldLoseWork = useCallback(
    (id: string) => {
      if (id === activeTabId) {
        const composer = useComposerStore.getState();
        const response = useResponseStore.getState();
        return tabHasStoredWork({
          composer: {
            messages: composer.messages,
            systemPrompt: composer.systemPrompt,
            temperature: composer.temperature,
            maxTokens: composer.maxTokens,
            topP: composer.topP,
            topK: composer.topK,
            frequencyPenalty: composer.frequencyPenalty,
            presencePenalty: composer.presencePenalty,
            stream: composer.stream,
            thinkingEnabled: composer.thinkingEnabled,
            thinkingBudgetTokens: composer.thinkingBudgetTokens,
            effort: composer.effort,
            verbosity: composer.verbosity,
            customHeaders: composer.customHeaders,
            activeCollectionId: composer.activeCollectionId,
            activeSavedRequestId: composer.activeSavedRequestId,
            scrollGeneration: composer.scrollGeneration,
          },
          response: {
            response: response.response,
            streamingContent: response.streamingContent,
            rawRequest: response.rawRequest,
            rawResponse: response.rawResponse,
            requestUrl: response.requestUrl,
            requestHeaders: response.requestHeaders,
            responseHeaders: response.responseHeaders,
            error: response.error,
            errorDetail: response.errorDetail,
            durationMs: response.durationMs,
            statusCode: response.statusCode,
            sentRequest: response.sentRequest,
            compatibilityWarnings: response.compatibilityWarnings,
          },
        });
      }
      const tab = tabs.find((t) => t.id === id);
      return tab ? tabHasStoredWork(tab) : false;
    },
    [activeTabId, tabs],
  );

  const requestClose = useCallback(
    (id: string) => {
      if (tabWouldLoseWork(id)) {
        setPendingCloseId(id);
        setShowDiscard(true);
        return;
      }
      closeTab(id);
    },
    [closeTab, tabWouldLoseWork],
  );

  const handleDiscardConfirm = useCallback(() => {
    if (pendingCloseId) {
      closeTab(pendingCloseId);
      setPendingCloseId(null);
    }
  }, [closeTab, pendingCloseId]);

  const handleTabListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const index = tabs.findIndex((tab) => tab.id === activeTabId);
      if (index === -1) return;
      const nextIndex =
        event.key === 'ArrowRight'
          ? Math.min(index + 1, tabs.length - 1)
          : Math.max(index - 1, 0);
      const nextTab = tabs[nextIndex];
      if (nextTab && nextTab.id !== activeTabId) {
        event.preventDefault();
        switchTab(nextTab.id);
      }
    },
    [activeTabId, switchTab, tabs],
  );

  return (
    <>
      <div
        className={cn(
          'border-border/70 bg-background flex h-8 shrink-0 items-center border-b transition-all',
          tabs.length <= 1 && 'hidden',
        )}
        role="tablist"
        aria-label="Request tabs"
        onKeyDown={handleTabListKeyDown}
      >
        {/* Scrollable tab list */}
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-center overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const label = isActive ? liveActiveLabel : tab.label;
            return (
              <div
                key={tab.id}
                title={label}
                className={cn(
                  'group border-border/50 flex h-full max-w-[160px] min-w-0 shrink-0 items-center border-r text-xs transition-colors',
                  isActive
                    ? 'bg-background text-foreground'
                    : 'bg-sidebar text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-active-tab={isActive || undefined}
                  onClick={() => switchTab(tab.id)}
                  className="focus-visible:ring-ring flex h-full min-w-0 flex-1 cursor-pointer items-center px-3 text-left focus-visible:ring-1 focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </button>
                {canClose && (
                  <button
                    type="button"
                    aria-label={`Close tab: ${label}`}
                    title={`Close tab: ${label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      requestClose(tab.id);
                    }}
                    className={cn(
                      'text-muted-foreground hover:text-foreground focus-visible:ring-ring mr-1 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded focus-visible:ring-1 focus-visible:outline-none',
                      isActive
                        ? 'opacity-60 hover:opacity-100'
                        : 'opacity-0 group-focus-within:opacity-60 group-hover:opacity-60 hover:opacity-100 focus:opacity-100',
                    )}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* New-tab button */}
        <button
          type="button"
          aria-label="New tab"
          title="New tab"
          onClick={createTab}
          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex h-full shrink-0 cursor-pointer items-center px-2.5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <ConfirmDiscardDialog
        open={showDiscard}
        onOpenChange={setShowDiscard}
        onConfirm={handleDiscardConfirm}
        title="Close tab?"
        description="This tab has unsaved composer content or a response that will be lost if you close it."
      />
    </>
  );
}
