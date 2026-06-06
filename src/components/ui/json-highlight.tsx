import { useMemo } from 'react';
import { tokenizeJson, type JsonTokenType } from '@/utils/json-highlight';
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
  const tokens = useMemo(() => tokenizeJson(json), [json]);

  return (
    <pre
      className={cn(
        'p-4 font-mono text-[13px] break-words whitespace-pre-wrap',
        className,
      )}
    >
      {tokens.map((token, index) => (
        <span key={index} className={TOKEN_CLASS[token.type]}>
          {token.value}
        </span>
      ))}
    </pre>
  );
}
