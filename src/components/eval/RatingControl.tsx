import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface RatingControlProps {
  rating: number | null;
  thumbs: 'up' | 'down' | null;
  onRatingChange: (value: number | null) => void;
  onThumbsChange: (value: 'up' | 'down' | null) => void;
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export function RatingControl({
  rating,
  thumbs,
  onRatingChange,
  onThumbsChange,
}: RatingControlProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label={t('eval.starRating')}
      >
        {STAR_VALUES.map((value) => {
          const active = rating !== null && value <= rating;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={t('eval.rateOutOfFive', { value })}
              onClick={() => onRatingChange(rating === value ? null : value)}
              className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
            >
              <Star
                className={cn(
                  'h-3.5 w-3.5 transition-colors',
                  active ? 'text-yellow-500' : 'opacity-60',
                )}
                fill={active ? 'currentColor' : 'none'}
              />
            </button>
          );
        })}
      </div>
      <div className="bg-border/70 h-3 w-px" />
      <button
        type="button"
        aria-label={t('eval.thumbsUp')}
        aria-pressed={thumbs === 'up'}
        onClick={() => onThumbsChange(thumbs === 'up' ? null : 'up')}
        className={cn(
          'hover:bg-muted/50 inline-flex size-7 items-center justify-center rounded-md transition-colors',
          thumbs === 'up'
            ? 'text-green-600 dark:text-green-400'
            : 'text-muted-foreground',
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={t('eval.thumbsDown')}
        aria-pressed={thumbs === 'down'}
        onClick={() => onThumbsChange(thumbs === 'down' ? null : 'down')}
        className={cn(
          'hover:bg-muted/50 inline-flex size-7 items-center justify-center rounded-md transition-colors',
          thumbs === 'down'
            ? 'text-red-600 dark:text-red-400'
            : 'text-muted-foreground',
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
