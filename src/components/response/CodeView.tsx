import { useMemo, useState } from 'react';
import { useComposerStore } from '@/stores/composer-store';
import { useSelectedProvider, useSelectedModel } from '@/stores/provider-store';
import { getCodeGenerators } from '@/services/codegen';
import { getSendableMessages } from '@/services/codegen/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

export function CodeView() {
  const provider = useSelectedProvider();
  const model = useSelectedModel();

  const messages = useComposerStore((s) => s.messages);
  const systemPrompt = useComposerStore((s) => s.systemPrompt);
  const temperature = useComposerStore((s) => s.temperature);
  const maxTokens = useComposerStore((s) => s.maxTokens);
  const topP = useComposerStore((s) => s.topP);
  const frequencyPenalty = useComposerStore((s) => s.frequencyPenalty);
  const presencePenalty = useComposerStore((s) => s.presencePenalty);
  const effort = useComposerStore((s) => s.effort);
  const verbosity = useComposerStore((s) => s.verbosity);
  const streamDefault = useComposerStore((s) => s.stream);
  const [overrideStream, setOverrideStream] = useState<boolean | null>(null);
  const stream = overrideStream ?? streamDefault;

  const toggleStream = () =>
    setOverrideStream((prev) => (prev === null ? !streamDefault : !prev));

  const generators = useMemo(
    () => (provider ? getCodeGenerators(provider) : []),
    [provider],
  );
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const activeTab =
    selectedTab && generators.some((gen) => gen.label === selectedTab)
      ? selectedTab
      : (generators[0]?.label ?? '');

  const activeCode = useMemo(() => {
    if (!provider || !model || !activeTab) return '';
    const gen = generators.find((g) => g.label === activeTab);
    if (!gen) return '';
    return gen.generate({
      provider,
      model: model.id,
      messages: getSendableMessages(messages),
      systemPrompt,
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      stream,
      effort,
      verbosity,
    });
  }, [
    provider,
    model,
    activeTab,
    messages,
    systemPrompt,
    temperature,
    maxTokens,
    topP,
    frequencyPenalty,
    presencePenalty,
    effort,
    verbosity,
    stream,
    generators,
  ]);

  if (!provider || !model) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
        Select a provider and model to see code
      </div>
    );
  }

  if (generators.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
        Code generation is not available for this provider type
      </div>
    );
  }

  const hasMessages = getSendableMessages(messages).length > 0;

  if (!hasMessages) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
        Enter a message to see code
      </div>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={setSelectedTab}
      className="flex h-full flex-col"
    >
      <div className="mt-2 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <TabsList className="h-7">
            {generators.map((gen) => (
              <TabsTrigger
                key={gen.label}
                value={gen.label}
                className="h-6 px-2.5 text-xs"
              >
                {gen.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            type="button"
            onClick={toggleStream}
            aria-pressed={stream}
            className={cn(
              'border-border h-6 cursor-pointer rounded border px-2 text-[11px] font-medium transition-colors',
              stream
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground bg-transparent',
            )}
          >
            {stream ? 'stream' : 'sync'}
          </button>
        </div>
        <CopyButton text={activeCode} />
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
