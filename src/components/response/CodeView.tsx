import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { getCodeGenerators } from '@/services/codegen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { exportCodeSnippet } from '@/utils/export';
import { cn } from '@/lib/utils';
import { buildCompatibleRequestFromComposer } from '@/utils/build-normalized-request';
import { getSendableMessages } from '@/services/codegen/shared';
import { headersToRecord } from '@/utils/headers';
import type { ComposerStore } from '@/stores/composer-store';
import type { ProviderConfig, ProviderModel } from '@/types/provider';

interface CodeViewProps {
  isActive?: boolean;
}

interface CodeViewState {
  provider: ProviderConfig | null;
  model: ProviderModel | null;
  messages: ComposerStore['messages'];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  thinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  effort: string;
  verbosity: string;
  customHeaders: ComposerStore['customHeaders'];
  stream: boolean;
}

function getCodeViewState(): CodeViewState {
  const composer = useComposerStore.getState();
  const providerState = useProviderStore.getState();
  const provider = providerState.selectedProviderId
    ? providerState.providers.find(
        (p) => p.id === providerState.selectedProviderId,
      ) || null
    : null;
  const model =
    provider?.models.find((m) => m.id === providerState.selectedModelId) ||
    null;

  return {
    provider,
    model,
    messages: composer.messages,
    systemPrompt: composer.systemPrompt,
    temperature: composer.temperature,
    maxTokens: composer.maxTokens,
    topP: composer.topP,
    topK: composer.topK,
    frequencyPenalty: composer.frequencyPenalty,
    presencePenalty: composer.presencePenalty,
    thinkingEnabled: composer.thinkingEnabled,
    thinkingBudgetTokens: composer.thinkingBudgetTokens,
    effort: composer.effort,
    verbosity: composer.verbosity,
    customHeaders: composer.customHeaders,
    stream: composer.stream,
  };
}

export function CodeView({ isActive = true }: CodeViewProps) {
  const [storedState, setStoredState] = useState<CodeViewState>(() =>
    getCodeViewState(),
  );
  const [overrideStream, setOverrideStream] = useState<boolean | null>(null);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const sync = () => {
      setStoredState(getCodeViewState());
    };

    const unsubscribeComposer = useComposerStore.subscribe(sync);
    const unsubscribeProvider = useProviderStore.subscribe(sync);

    return () => {
      unsubscribeComposer();
      unsubscribeProvider();
    };
  }, [isActive]);

  const state = isActive ? getCodeViewState() : storedState;
  const {
    provider,
    model,
    messages,
    systemPrompt,
    temperature,
    maxTokens,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    thinkingEnabled,
    thinkingBudgetTokens,
    effort,
    verbosity,
    customHeaders,
    stream: streamDefault,
  } = state;

  const stream = overrideStream ?? streamDefault;
  const toggleStream = () =>
    setOverrideStream((prev) => (prev === null ? !streamDefault : !prev));

  const sendableMessages = useMemo(
    () => getSendableMessages(messages),
    [messages],
  );
  const hasMessages = sendableMessages.length > 0;
  const customHeaderRecord = useMemo(
    () => headersToRecord(customHeaders),
    [customHeaders],
  );
  const generators = useMemo(
    () => (provider ? getCodeGenerators(provider) : []),
    [provider],
  );
  const activeTab =
    selectedTab && generators.some((gen) => gen.label === selectedTab)
      ? selectedTab
      : (generators[0]?.label ?? '');

  const compatibleRequest = useMemo(() => {
    if (!provider || !model || !hasMessages || !isActive) {
      return null;
    }

    return buildCompatibleRequestFromComposer({
      composer: {
        messages,
        systemPrompt,
        temperature,
        maxTokens,
        topP,
        topK,
        frequencyPenalty,
        presencePenalty,
        stream,
        thinkingEnabled,
        thinkingBudgetTokens,
        effort,
        verbosity,
      },
      messages: sendableMessages,
      model,
      provider,
      selectedModelId: model.id,
      streamOverride: stream,
    });
    // Intentionally exclude isActive so reactivating with unchanged inputs reuses
    // the last generated request instead of forcing a fresh codegen pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effort,
    frequencyPenalty,
    hasMessages,
    maxTokens,
    messages,
    model,
    presencePenalty,
    provider,
    sendableMessages,
    stream,
    systemPrompt,
    temperature,
    thinkingBudgetTokens,
    thinkingEnabled,
    topK,
    topP,
    verbosity,
  ]);

  const activeCode = useMemo(() => {
    if (!provider || !compatibleRequest || !activeTab) {
      return '';
    }

    const generator = generators.find((gen) => gen.label === activeTab);
    if (!generator) {
      return '';
    }

    return generator.generate({
      provider,
      request: compatibleRequest.request,
      customHeaders: customHeaderRecord,
    });
  }, [activeTab, compatibleRequest, customHeaderRecord, generators, provider]);

  if (!provider || !model) {
    return <EmptyState title="Select a provider and model to see code" />;
  }

  if (generators.length === 0) {
    return (
      <EmptyState title="Code generation is not available for this provider type" />
    );
  }

  if (!hasMessages) {
    return <EmptyState title="Enter a message to see code" />;
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={setSelectedTab}
      className="flex h-full flex-col"
    >
      <div className="mt-2 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <TabsList variant="line" className="h-7 gap-0">
            {generators.map((gen) => (
              <TabsTrigger
                key={gen.label}
                value={gen.label}
                className="px-3 text-xs"
              >
                {gen.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={toggleStream}
            aria-pressed={stream}
            className={cn(
              'border-border border',
              stream
                ? 'bg-accent text-accent-foreground hover:bg-accent/80'
                : 'text-muted-foreground',
            )}
          >
            {stream ? 'stream' : 'sync'}
          </Button>
        </div>
        <div className="flex items-center">
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            tooltip="Export code snippet"
            disabled={!activeCode}
            onClick={() => exportCodeSnippet(activeCode, activeTab)}
          >
            <Download className="h-3.5 w-3.5" />
          </IconButton>
          <CopyButton text={activeCode} />
        </div>
      </div>
      {generators.map((gen) => (
        <TabsContent
          key={gen.label}
          value={gen.label}
          className="relative mt-0 min-h-0 flex-1 overflow-y-auto"
        >
          <pre className="m-0 h-full overflow-x-auto p-4 text-[13px] leading-relaxed">
            <code className="font-mono text-xs">{activeCode}</code>
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}
