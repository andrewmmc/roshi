import { useMemo } from 'react';
import {
  JSON_HIGHLIGHT_MAX_CHARS,
  JSON_HIGHLIGHT_MAX_TOKENS,
  tokenizeJsonWithLimit,
  type JsonTokenType,
} from '@/utils/json-highlight';
import { cn } from '@/lib/utils';

const TOKEN_CLASS: Record<JsonTokenType, string> = {
  key: 'text-sky-700 dark:text-sky-300',
  string: 'text-emerald-700 dark:text-emerald-300',
  number: 'text-amber-700 dark:text-amber-300',
  boolean: 'text-violet-700 dark:text-violet-300',
  null: 'text-violet-700 dark:text-violet-300',
  punctuation: 'text-muted-foreground',
};

export function JsonHighlight({
  json,
  className,
}: {
  json: string;
  className?: string;
}) {
  const highlightState = useMemo(() => {
    if (json.length > JSON_HIGHLIGHT_MAX_CHARS) {
      return { highlighted: false as const };
    }

    const tokenization = tokenizeJsonWithLimit(json, {
      maxTokens: JSON_HIGHLIGHT_MAX_TOKENS,
    });
    if (tokenization.truncated) {
      return { highlighted: false as const };
    }

    return { highlighted: true as const, tokens: tokenization.tokens };
  }, [json]);

  if (!highlightState.highlighted) {
    return (
      <div className="flex flex-col">
        <div className="text-muted-foreground border-b px-4 py-2 text-xs">
          Syntax highlighting disabled for large payload
        </div>
        <pre
          className={cn(
            'overflow-x-auto p-4 font-mono text-[13px] whitespace-pre',
            className,
          )}
        >
          {json}
        </pre>
      </div>
    );
  }

  return (
    <pre
      className={cn(
        'p-4 font-mono text-[13px] break-words whitespace-pre-wrap',
        className,
      )}
    >
      {highlightState.tokens.map((token, index) => (
        <span key={index} className={TOKEN_CLASS[token.type]}>
          {token.value}
        </span>
      ))}
    </pre>
  );
}
