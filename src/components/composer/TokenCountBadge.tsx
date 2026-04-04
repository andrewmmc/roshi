import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTokenCount } from '@/hooks/use-token-count';
import { formatCount } from '@/utils/format';

export function TokenCountBadge() {
  const tokenCount = useTokenCount();

  if (tokenCount === null || tokenCount === 0) return null;

  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger className="text-muted-foreground hover:text-foreground cursor-default font-mono text-xs tabular-nums transition-colors">
          ~{formatCount(tokenCount)} tokens
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Estimated prompt tokens: {tokenCount.toLocaleString()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
