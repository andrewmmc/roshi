import type { NormalizedMessage, NormalizedRequest } from '@/types/normalized';
import type { ProviderConfig, ProviderModel } from '@/types/provider';
import {
  filterRequestByCapabilities,
  type RequestCompatibilityResult,
} from '@/models/compatibility';
import { resolveModelCapabilities } from '@/models/resolver';

export interface ComposerRequestFields {
  messages: NormalizedMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
  thinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  effort: string;
  verbosity: string;
}

export function filterComposerMessages(
  messages: NormalizedMessage[],
): NormalizedMessage[] {
  return messages.filter(
    (message) =>
      message.content.trim() ||
      (message.attachments && message.attachments.length > 0),
  );
}

export function buildNormalizedRequestFromComposer(
  composer: ComposerRequestFields,
  modelId: string,
  messages: NormalizedMessage[] = filterComposerMessages(composer.messages),
): NormalizedRequest {
  return {
    messages,
    model: modelId,
    temperature: composer.temperature,
    maxTokens: composer.maxTokens,
    topP: composer.topP,
    topK: composer.topK || undefined,
    frequencyPenalty: composer.frequencyPenalty,
    presencePenalty: composer.presencePenalty,
    stream: composer.stream,
    systemPrompt: composer.systemPrompt || undefined,
    effort: composer.effort,
    verbosity: composer.verbosity,
    thinking: composer.thinkingEnabled
      ? { enabled: true, budgetTokens: composer.thinkingBudgetTokens }
      : undefined,
  };
}

export function buildCompatibleRequestFromComposer({
  composer,
  messages,
  model,
  provider,
  selectedModelId,
  streamOverride,
}: {
  composer: ComposerRequestFields;
  messages: NormalizedMessage[];
  model: ProviderModel | null;
  provider: ProviderConfig;
  selectedModelId: string | null;
  streamOverride?: boolean;
}): RequestCompatibilityResult {
  const modelId = model?.id ?? selectedModelId ?? '';
  const capabilities = resolveModelCapabilities(provider, modelId);
  const request = buildNormalizedRequestFromComposer(
    composer,
    modelId,
    messages,
  );

  request.stream =
    (streamOverride ?? composer.stream) && capabilities.streaming;
  request.effort = capabilities.params.effort ? composer.effort : undefined;
  request.verbosity = capabilities.params.verbosity
    ? composer.verbosity
    : undefined;

  return filterRequestByCapabilities(request, capabilities);
}
