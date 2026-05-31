import type { ProviderConfig } from '@/types/provider';
import { defaultCapabilitiesForProviderType } from './capabilities';
import type { ModelCapabilities } from './capabilities';
import {
  MODEL_CAPABILITY_OVERRIDES,
  MODEL_CAPABILITY_PATTERNS,
} from './registry';

export function resolveModelCapabilities(
  provider: ProviderConfig,
  modelId: string,
): ModelCapabilities {
  const exact = MODEL_CAPABILITY_OVERRIDES[modelId];
  if (exact) return exact;

  const match = MODEL_CAPABILITY_PATTERNS.find(({ pattern }) =>
    pattern.test(modelId),
  );
  if (match) return match.capabilities;

  const model = provider.models.find((m) => m.id === modelId);
  if (model) {
    return {
      ...defaultCapabilitiesForProviderType(provider.type),
      streaming: model.supportsStreaming,
    };
  }

  return defaultCapabilitiesForProviderType(provider.type);
}
