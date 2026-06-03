import type { ProviderConfig } from '@/types/provider';
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
        defaultCapabilitiesForProviderType(provider.type),
        model.capabilities,
      ),
      streaming: model.supportsStreaming,
    };
  }

  return defaultCapabilitiesForProviderType(provider.type);
}
