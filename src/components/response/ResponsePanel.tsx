import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './ChatView';
import { RawJsonView } from './RawJsonView';
import { CodeView } from './CodeView';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import { useSendRequest } from '@/hooks/use-send-request';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GitCompareArrows } from 'lucide-react';
import { estimateCostUsd, formatUsd } from '@/lib/cost';
import type { NormalizedRequest, NormalizedResponse } from '@/types/normalized';
import type { RequestRunMeta } from '@/stores/request-store';

interface ResponseColumnData {
  sentRequest: NormalizedRequest | null;
  response: NormalizedResponse | null;
  rawRequest: Record<string, unknown> | null;
  rawResponse: Record<string, unknown> | null;
  error: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  durationMs: number | null;
  statusCode: number | null;
  runMeta: RequestRunMeta | null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      {label}: {value}
    </span>
  );
}

function ResponseColumn({
  title,
  data,
  view,
  borderClassName,
}: {
  title: string;
  data: ResponseColumnData;
  view: 'chat' | 'raw';
  borderClassName?: string;
}) {
  const modelForCost = data.runMeta?.modelId || data.response?.model || '';
  const usage = data.response?.usage ?? null;
  const totalTokens = usage ? usage.totalTokens.toLocaleString() : 'N/A';
  const latency = data.durationMs !== null ? `${data.durationMs}ms` : 'N/A';
  const cost = formatUsd(estimateCostUsd(modelForCost, usage));
  const status =
    data.statusCode === null
      ? 'N/A'
      : `${data.statusCode} ${data.statusCode < 300 ? 'OK' : 'ERR'}`;

  return (
    <div className={`flex h-full min-w-0 flex-col ${borderClassName || ''}`}>
      <div className="flex items-start justify-between gap-3 border-b px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          <div className="truncate text-[12px] text-foreground/85">
            {data.runMeta?.providerName || 'Provider'} / {data.runMeta?.modelDisplayName || 'Model'}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <Metric label="tok" value={totalTokens} />
          <Metric label="lat" value={latency} />
          <Metric label="cost" value={cost} />
          <Metric label="http" value={status} />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {view === 'chat' ? (
          <ChatView
            sentRequest={data.sentRequest}
            response={data.response}
            isLoading={data.isLoading}
            isStreaming={data.isStreaming}
            streamingContent={data.streamingContent}
            error={data.error}
          />
        ) : (
          <RawJsonView rawRequest={data.rawRequest} rawResponse={data.rawResponse} />
        )}
      </div>
    </div>
  );
}

function ComparisonSummary({
  primary,
  secondary,
}: {
  primary: ResponseColumnData;
  secondary: ResponseColumnData;
}) {
  const primaryUsage = primary.response?.usage ?? null;
  const secondaryUsage = secondary.response?.usage ?? null;
  const primaryCost = estimateCostUsd(primary.runMeta?.modelId || primary.response?.model || '', primaryUsage);
  const secondaryCost = estimateCostUsd(secondary.runMeta?.modelId || secondary.response?.model || '', secondaryUsage);

  return (
    <div className="flex items-center gap-4 border-b bg-muted/20 px-4 py-1.5 text-[11px] text-muted-foreground">
      <span>
        Tokens: {primaryUsage ? primaryUsage.totalTokens.toLocaleString() : 'N/A'} vs{' '}
        {secondaryUsage ? secondaryUsage.totalTokens.toLocaleString() : 'N/A'}
      </span>
      <span>
        Latency: {primary.durationMs !== null ? `${primary.durationMs}ms` : 'N/A'} vs{' '}
        {secondary.durationMs !== null ? `${secondary.durationMs}ms` : 'N/A'}
      </span>
      <span>Cost: {formatUsd(primaryCost)} vs {formatUsd(secondaryCost)}</span>
    </div>
  );
}

export function ResponsePanel() {
  const { compare } = useSendRequest();

  const providers = useProviderStore((s) => s.providers);
  const selectedProviderId = useProviderStore((s) => s.selectedProviderId);
  const selectedModelId = useProviderStore((s) => s.selectedModelId);
  const isLoading = useRequestStore((s) => s.isLoading);
  const isStreaming = useRequestStore((s) => s.isStreaming);
  const response = useRequestStore((s) => s.response);
  const error = useRequestStore((s) => s.error);
  const durationMs = useRequestStore((s) => s.durationMs);
  const statusCode = useRequestStore((s) => s.statusCode);
  const sentRequest = useRequestStore((s) => s.sentRequest);
  const rawRequest = useRequestStore((s) => s.rawRequest);
  const rawResponse = useRequestStore((s) => s.rawResponse);
  const streamingContent = useRequestStore((s) => s.streamingContent);
  const primaryRunMeta = useRequestStore((s) => s.primaryRunMeta);
  const comparison = useRequestStore((s) => s.comparison);
  const compareTargetProviderId = useRequestStore((s) => s.compareTargetProviderId);
  const compareTargetModelId = useRequestStore((s) => s.compareTargetModelId);
  const setCompareTargetProviderId = useRequestStore((s) => s.setCompareTargetProviderId);
  const setCompareTargetModelId = useRequestStore((s) => s.setCompareTargetModelId);

  const selectedProvider = selectedProviderId
    ? providers.find((p) => p.id === selectedProviderId) || null
    : null;
  const selectedModel =
    selectedProvider?.models.find((m) => m.id === selectedModelId) || null;

  const isCodeTabEnabled = selectedProvider
    ? selectedProvider.type === 'openai-compatible' || selectedProvider.type === 'custom'
    : false;

  const compareProvider = compareTargetProviderId
    ? providers.find((p) => p.id === compareTargetProviderId) || null
    : null;
  const compareModels = compareProvider?.models || [];

  useEffect(() => {
    if (providers.length === 0) return;

    const fallbackProvider =
      compareProvider ||
      providers.find((p) => p.id !== selectedProviderId) ||
      providers[0];

    if (!fallbackProvider) return;
    if (fallbackProvider.id !== compareTargetProviderId) {
      setCompareTargetProviderId(fallbackProvider.id);
    }

    const fallbackModel =
      fallbackProvider.models.find((m) => m.id === compareTargetModelId) ||
      fallbackProvider.models.find(
        (m) => !(fallbackProvider.id === selectedProviderId && m.id === selectedModelId),
      ) ||
      fallbackProvider.models[0] ||
      null;

    if (fallbackModel && fallbackModel.id !== compareTargetModelId) {
      setCompareTargetModelId(fallbackModel.id);
    }
  }, [
    providers,
    compareProvider,
    compareTargetProviderId,
    compareTargetModelId,
    selectedProviderId,
    selectedModelId,
    setCompareTargetProviderId,
    setCompareTargetModelId,
  ]);

  const primaryData: ResponseColumnData = {
    sentRequest,
    response,
    rawRequest,
    rawResponse,
    error,
    isLoading,
    isStreaming,
    streamingContent,
    durationMs,
    statusCode,
    runMeta:
      primaryRunMeta ||
      (selectedProvider && selectedModel
        ? {
            providerId: selectedProvider.id,
            providerName: selectedProvider.name,
            modelId: selectedModel.id,
            modelDisplayName: selectedModel.displayName,
          }
        : null),
  };

  const compareData: ResponseColumnData = {
    sentRequest: comparison.sentRequest,
    response: comparison.response,
    rawRequest: comparison.rawRequest,
    rawResponse: comparison.rawResponse,
    error: comparison.error,
    isLoading: comparison.isLoading,
    isStreaming: comparison.isStreaming,
    streamingContent: comparison.streamingContent,
    durationMs: comparison.durationMs,
    statusCode: comparison.statusCode,
    runMeta: comparison.runMeta,
  };

  const hasPrimaryContent = response || error || isStreaming || isLoading;
  const hasComparisonContent =
    comparison.response || comparison.error || comparison.isStreaming || comparison.isLoading;
  const hasContent = hasPrimaryContent || hasComparisonContent;
  const showSplitView = Boolean(hasComparisonContent);
  const canCompare =
    !!sentRequest && !!compareTargetProviderId && !!compareTargetModelId && !isLoading;

  return (
    <Tabs defaultValue="chat" className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 h-11 border-b shrink-0">
        <TabsList className="h-7">
          <TabsTrigger value="chat" className="text-xs h-6 px-2.5">Chat</TabsTrigger>
          <TabsTrigger value="raw" className="text-xs h-6 px-2.5">Raw</TabsTrigger>
          <TabsTrigger value="code" className="text-xs h-6 px-2.5" disabled={!isCodeTabEnabled}>
            Code
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-1.5">
          <Select
            value={compareTargetProviderId || ''}
            onValueChange={(id) => {
              setCompareTargetProviderId(id);
              const provider = providers.find((p) => p.id === id) || null;
              setCompareTargetModelId(provider?.models[0]?.id || null);
            }}
          >
            <SelectTrigger className="h-7 w-[132px] text-xs">
              <SelectValue placeholder="Compare provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={compareTargetModelId || ''}
            onValueChange={setCompareTargetModelId}
          >
            <SelectTrigger className="h-7 w-[168px] text-xs">
              <SelectValue placeholder="Compare model" />
            </SelectTrigger>
            <SelectContent>
              {compareModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={compare}
            disabled={!canCompare || comparison.isLoading}
          >
            <GitCompareArrows className="mr-1.5 h-3 w-3" />
            {comparison.isLoading ? 'Comparing...' : 'Compare'}
          </Button>
        </div>
      </div>

      {showSplitView && <ComparisonSummary primary={primaryData} secondary={compareData} />}

      <TabsContent value="chat" className="flex-1 min-h-0 mt-0 overflow-hidden">
        {hasContent ? (
          <div className={`h-full ${showSplitView ? 'grid grid-cols-2 divide-x' : ''}`}>
            <ResponseColumn title="Primary" data={primaryData} view="chat" />
            {showSplitView && <ResponseColumn title="Compare" data={compareData} view="chat" />}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
            Send a request to see the response
          </div>
        )}
      </TabsContent>

      <TabsContent value="raw" className="flex-1 min-h-0 mt-0 overflow-hidden">
        {hasContent ? (
          <div className={`h-full ${showSplitView ? 'grid grid-cols-2 divide-x' : ''}`}>
            <ResponseColumn title="Primary" data={primaryData} view="raw" />
            {showSplitView && <ResponseColumn title="Compare" data={compareData} view="raw" />}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
            Send a request to see raw JSON
          </div>
        )}
      </TabsContent>

      <TabsContent value="code" className="flex-1 min-h-0 mt-0 overflow-hidden">
        <CodeView />
      </TabsContent>
    </Tabs>
  );
}
