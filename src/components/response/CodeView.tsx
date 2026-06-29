import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useComposerStore } from '@/stores/composer-store';
import { useSelectedProvider, useSelectedModel } from '@/stores/provider-store';
import { getCodeGenerators } from '@/services/codegen';
import { getSendableMessages } from '@/services/codegen/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { exportCodeSnippet } from '@/utils/export';
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
    return <EmptyState title="Select a provider and model to see code" />;
  }

  if (generators.length === 0) {
    return (
      <EmptyState title="Code generation is not available for this provider type" />
    );
  }

  const hasMessages = getSendableMessages(messages).length > 0;

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
