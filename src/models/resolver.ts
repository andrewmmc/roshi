import { resolveProviderProtocol, type ProviderConfig } from '@/types/provider';
import { defaultCapabilitiesForProviderType } from './capabilities';
import type { ModelCapabilities } from './capabilities';
import {
  MODEL_CAPABILITY_OVERRIDES,
  MODEL_CAPABILITY_PATTERNS,
} from './registry';

function mergeCapabilities(
  base: ModelCapabilities,
  overrides: ProviderConfig['models'][0]['capabilities'] | undefined,
): ModelCapabilities {
  if (!overrides) return base;

  return {
    ...base,
    ...overrides,
    params: {
      ...base.params,
      ...overrides.params,
    },
  };
}

function applyModelMetadata(
  capabilities: ModelCapabilities,
  model: ProviderConfig['models'][0] | undefined,
): ModelCapabilities {
  const merged = {
    ...mergeCapabilities(capabilities, model?.capabilities),
    streaming: capabilities.streaming,
  };
  return model?.supportsStreaming === false
    ? { ...merged, streaming: false }
    : merged;
}

function defaultCapabilitiesForProvider(
  provider: ProviderConfig,
): ModelCapabilities {
  const capabilities = defaultCapabilitiesForProviderType(provider.type);
  if (resolveProviderProtocol(provider) !== 'openai-responses') {
    return capabilities;
  }

  return {
    ...capabilities,
    params: {
      ...capabilities.params,
      frequencyPenalty: {
        supported: false,
        reason:
          'Frequency penalty is not supported by the OpenAI Responses API.',
      },
      presencePenalty: {
        supported: false,
        reason:
          'Presence penalty is not supported by the OpenAI Responses API.',
      },
      maxTokens: { supported: true, wireName: 'max_output_tokens' },
    },
  };
}

export function resolveModelCapabilities(
  provider: ProviderConfig,
  modelId: string,
): ModelCapabilities {
  const model = provider.models.find((m) => m.id === modelId);
  const exact = MODEL_CAPABILITY_OVERRIDES[modelId];
  if (exact) return applyModelMetadata(exact, model);

  const match = MODEL_CAPABILITY_PATTERNS.find(({ pattern }) =>
    pattern.test(modelId),
  );
  if (match) return applyModelMetadata(match.capabilities, model);

  if (model) {
    return {
      ...mergeCapabilities(
        defaultCapabilitiesForProvider(provider),
        model.capabilities,
      ),
      streaming: model.supportsStreaming,
    };
  }

  return defaultCapabilitiesForProvider(provider);
}
