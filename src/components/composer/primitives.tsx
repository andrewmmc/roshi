import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PARAM_INFO } from '@/components/composer/parameter-control-utils';

/**
 * Shared presentational building blocks for the request and eval composers.
 * Keeping these in one place prevents the two composers from drifting.
 */

export function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          aria-label="More information"
          className="text-muted-foreground/40 hover:text-muted-foreground inline-flex cursor-default items-center"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
            <path d="M6 5.5v3" stroke="currentColor" strokeLinecap="round" />
            <circle cx="6" cy="3.5" r="0.6" fill="currentColor" />
          </svg>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-60 text-xs leading-snug">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-0.5 flex items-center gap-2">
      <span className="text-muted-foreground/50 text-[11px] font-medium tracking-wide uppercase">
        {children}
      </span>
      <div className="bg-border/50 h-px flex-1" />
    </div>
  );
}

export function SliderNumberRow({
  label,
  paramKey,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  decimals = 2,
  disabled = false,
  disabledReason,
}: {
  label: string;
  paramKey: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputId = `param-${paramKey}`;
  const info = PARAM_INFO[paramKey];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Label
            htmlFor={inputId}
            className={`text-xs whitespace-nowrap ${disabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
            title={disabledReason}
          >
            {label}
          </Label>
          {info && <InfoTooltip content={info} />}
        </div>
        <Input
          id={inputId}
          type="number"
          value={value.toFixed(decimals)}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(
              isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed)),
            );
          }}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          title={disabledReason}
          className="h-6 w-20 font-mono text-xs"
        />
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => {
          const val = Array.isArray(v) ? v[0] : (v as number);
          if (val !== undefined) onChange(val);
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={`${label} slider`}
      />
    </div>
  );
}

export function CheckboxRow({
  label,
  paramKey,
  checked,
  onChange,
  disabled = false,
  disabledReason,
}: {
  label: string;
  paramKey: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputId = `param-${paramKey}`;
  const info = PARAM_INFO[paramKey];
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-1.5">
        <Label
          htmlFor={inputId}
          className={`text-xs ${disabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
          title={disabledReason}
        >
          {label}
        </Label>
        {info && <InfoTooltip content={info} />}
      </div>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        title={disabledReason}
        className="rounded"
      />
    </div>
  );
}
