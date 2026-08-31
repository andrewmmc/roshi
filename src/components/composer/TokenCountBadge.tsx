import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTokenCount } from '@/hooks/use-token-count';
import { formatCount } from '@/utils/format';
import { useTranslation } from '@/i18n';

export function TokenCountBadge() {
  const { t, formatNumber } = useTranslation();
  const tokenCount = useTokenCount();

  if (tokenCount === null || tokenCount === 0) return null;

  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger className="text-muted-foreground hover:text-foreground cursor-default font-mono text-xs tabular-nums transition-colors">
          {t('request.tokenEstimate', { count: formatCount(tokenCount) })}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t('request.tokenEstimateDetail', {
            count: formatNumber(tokenCount),
          })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
