import { useEffect, useRef, useState } from 'react';
import { useComposerStore } from '@/stores/composer-store';
import { estimateTokenCount } from '@/utils/token-count';

const DEBOUNCE_MS = 300;

export function useTokenCount() {
  const messages = useComposerStore((s) => s.messages);
  const systemPrompt = useComposerStore((s) => s.systemPrompt);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      estimateTokenCount(messages, systemPrompt).then(setTokenCount);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [messages, systemPrompt]);

  return tokenCount;
}
