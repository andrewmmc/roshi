import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import {
  buildCompatibleRequestFromComposer,
  filterComposerMessages,
  type ComposerRequestFields,
} from '@/utils/build-normalized-request';

export function useRequestCompatibilityPreview(): { warnings: string[] } {
  const composer = useComposerStore(
    useShallow(
      (s): ComposerRequestFields => ({
        messages: s.messages,
        systemPrompt: s.systemPrompt,
        temperature: s.temperature,
        maxTokens: s.maxTokens,
        topP: s.topP,
        topK: s.topK,
        frequencyPenalty: s.frequencyPenalty,
        presencePenalty: s.presencePenalty,
        stream: s.stream,
        thinkingEnabled: s.thinkingEnabled,
        thinkingBudgetTokens: s.thinkingBudgetTokens,
        effort: s.effort,
        verbosity: s.verbosity,
      }),
    ),
  );
  const provider = useProviderStore((s) => s.getSelectedProvider());
  const model = useProviderStore((s) => s.getSelectedModel());
  const selectedModelId = useProviderStore((s) => s.selectedModelId);

  return useMemo(() => {
    if (!provider) {
      return { warnings: [] };
    }

    const messages = filterComposerMessages(composer.messages);
    if (messages.length === 0) {
      return { warnings: [] };
    }

    const compatibility = buildCompatibleRequestFromComposer({
      composer,
      messages,
      model,
      provider,
      selectedModelId,
    });

    return { warnings: compatibility.warnings };
  }, [composer, model, provider, selectedModelId]);
}
