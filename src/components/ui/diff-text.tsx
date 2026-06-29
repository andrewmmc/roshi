import type { DiffSegment } from '@/utils/diff';
import { cn } from '@/lib/utils';

export function DiffText({
  segments,
  className,
}: {
  segments: DiffSegment[];
  className?: string;
}) {
  return (
    <pre
      className={cn(
        'font-mono text-xs leading-relaxed whitespace-pre-wrap',
        className,
      )}
    >
      {segments.map((segment, index) => (
        <span
          key={index}
          className={cn(
            segment.op === 'insert' &&
              'bg-green-500/15 text-green-700 dark:text-green-300',
            segment.op === 'delete' &&
              'bg-red-500/15 text-red-700 line-through dark:text-red-300',
          )}
        >
          {segment.value}
        </span>
      ))}
    </pre>
  );
}
