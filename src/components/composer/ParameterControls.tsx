import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PARAM_INFO,
  TEMP_PRESETS,
} from '@/components/composer/parameter-control-utils';
import { useParameterControlsState } from '@/components/composer/use-parameter-controls-state';
import { ModelCompatibilitySummary } from '@/components/composer/ModelCompatibilitySummary';
import type { ResolvedSliderParam } from '@/components/composer/use-parameter-controls-state';

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger className="text-muted-foreground/40 hover:text-muted-foreground inline-flex cursor-default items-center">
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
        <TooltipContent
          side="right"
          className="max-w-60 text-[11px] leading-snug"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-0.5 flex items-center gap-2">
      <span className="text-muted-foreground/50 text-[10px] font-semibold tracking-widest uppercase">
        {children}
      </span>
      <div className="bg-border/50 h-px flex-1" />
    </div>
  );
}

function SliderNumberRow({
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
          className="h-6 w-20 font-mono text-[11px] md:text-[11px]"
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

function ConfiguredSliderRow({ param }: { param: ResolvedSliderParam }) {
  return (
    <SliderNumberRow
      label={param.label}
      paramKey={param.paramKey}
      value={param.value}
      onChange={param.onChange}
      min={param.min}
      max={param.max}
      step={param.step}
      decimals={param.decimals}
      disabled={!param.canEdit}
      disabledReason={param.disabledReason}
    />
  );
}

function SelectRow({
  label,
  paramKey,
  value,
  values,
  onChange,
  disabled = false,
  disabledReason,
}: {
  label: string;
  paramKey: string;
  value: string;
  values: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputId = `param-${paramKey}`;
  const info = PARAM_INFO[paramKey];
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Label
            htmlFor={inputId}
            className={`text-xs ${disabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
            title={disabledReason}
          >
            {label}
          </Label>
          {info && <InfoTooltip content={info} />}
        </div>
        <Select
          value={value}
          onValueChange={(nextValue) => {
            if (nextValue !== null) onChange(nextValue);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            id={inputId}
            size="sm"
            className="h-6 w-28 font-mono text-[11px] md:text-[11px]"
            title={disabledReason}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {values.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CheckboxRow({
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

export function ParameterControls() {
  const {
    capabilities,
    temperature,
    maxTokens,
    stream,
    thinkingEnabled,
    thinkingBudgetTokens,
    effort,
    verbosity,
    setMaxTokens,
    setStream,
    setThinkingEnabled,
    setThinkingBudgetTokens,
    setEffort,
    setVerbosity,
    resetParameters,
    samplingParams,
    penaltyParams,
    canEditMaxTokens,
    supportsStreaming,
    supportsThinking,
    supportsThinkingBudget,
    isAdaptiveThinkingOnly,
    effortSupport,
    verbositySupport,
    canEditTemperature,
    applyTempPreset,
  } = useParameterControlsState();

  const temperatureParam = samplingParams.find(
    (param) => param.capabilityKey === 'temperature',
  );
  const otherSamplingParams = samplingParams.filter(
    (param) => param.capabilityKey !== 'temperature',
  );

  return (
    <div className="flex flex-col gap-3">
      <ModelCompatibilitySummary />
      <SectionHeader>Sampling</SectionHeader>

      {temperatureParam && (
        <div className="flex flex-col gap-1.5">
          <ConfiguredSliderRow param={temperatureParam} />
          {canEditTemperature && (
            <div className="flex gap-1 pl-0">
              {TEMP_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  title={preset.title}
                  onClick={() => applyTempPreset(preset.value)}
                  className={`h-5 flex-1 px-0 text-[10px] transition-colors ${
                    Math.abs(temperature - preset.value) < 0.001
                      ? 'bg-accent border-accent-foreground/20 text-accent-foreground'
                      : ''
                  }`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {otherSamplingParams.map((param) => (
        <ConfiguredSliderRow key={param.capabilityKey} param={param} />
      ))}

      <SectionHeader>Penalties</SectionHeader>

      {penaltyParams.map((param) => (
        <ConfiguredSliderRow key={param.capabilityKey} param={param} />
      ))}

      <SectionHeader>Output</SectionHeader>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <Label
              htmlFor="param-max-tokens"
              className={`text-xs ${!canEditMaxTokens ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
              title={
                !canEditMaxTokens
                  ? 'Max tokens is not supported by the selected model.'
                  : undefined
              }
            >
              Max Tokens
            </Label>
            <InfoTooltip content={PARAM_INFO['max-tokens']} />
          </div>
          <Input
            id="param-max-tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 0)}
            className="h-6 w-20 font-mono text-[11px] md:text-[11px]"
            min={1}
            max={capabilities?.tokenLimits?.output ?? 1000000}
            disabled={!canEditMaxTokens}
            title={
              !canEditMaxTokens
                ? 'Max tokens is not supported by the selected model.'
                : undefined
            }
          />
        </div>
        {capabilities?.tokenLimits?.output && (
          <p className="text-muted-foreground/40 text-right text-[10px]">
            model limit: {capabilities.tokenLimits.output.toLocaleString()}
          </p>
        )}
      </div>

      <CheckboxRow
        label="Stream"
        paramKey="stream"
        checked={stream && supportsStreaming}
        onChange={setStream}
        disabled={!supportsStreaming}
        disabledReason={
          !supportsStreaming
            ? 'Streaming is not supported by the selected model.'
            : undefined
        }
      />

      <SectionHeader>Advanced</SectionHeader>

      <CheckboxRow
        label="Thinking"
        paramKey="thinking"
        checked={thinkingEnabled}
        onChange={setThinkingEnabled}
        disabled={!supportsThinking}
        disabledReason={
          !supportsThinking
            ? 'Thinking controls are not supported by the selected model.'
            : undefined
        }
      />

      {supportsThinking && supportsThinkingBudget && thinkingEnabled && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <Label
              htmlFor="param-budget-tokens"
              className="text-muted-foreground text-xs"
            >
              Budget Tokens
            </Label>
            <InfoTooltip content={PARAM_INFO['budget-tokens']} />
          </div>
          <Input
            id="param-budget-tokens"
            type="number"
            value={thinkingBudgetTokens}
            onChange={(e) =>
              setThinkingBudgetTokens(
                Math.max(1024, parseInt(e.target.value, 10) || 1024),
              )
            }
            className="h-6 w-20 font-mono text-[11px] md:text-[11px]"
            min={1024}
            max={capabilities?.tokenLimits?.output ?? 1000000}
            step={1024}
          />
        </div>
      )}

      {supportsThinking && isAdaptiveThinkingOnly && thinkingEnabled && (
        <p className="text-muted-foreground/60 text-[11px]">
          This model uses adaptive thinking — the reasoning depth is set
          automatically.
        </p>
      )}

      {effortSupport && (
        <SelectRow
          label="Effort"
          paramKey="effort"
          value={
            effortSupport.levels.includes(effort)
              ? effort
              : effortSupport.defaultLevel
          }
          values={effortSupport.levels}
          onChange={setEffort}
        />
      )}

      {verbositySupport && (
        <SelectRow
          label="Verbosity"
          paramKey="verbosity"
          value={
            verbositySupport.levels.includes(verbosity)
              ? verbosity
              : verbositySupport.defaultLevel
          }
          values={verbositySupport.levels}
          onChange={setVerbosity}
        />
      )}

      {capabilities?.quirks && capabilities.quirks.length > 0 && (
        <div className="border-border/50 mt-1 rounded-lg border p-2">
          <p className="text-muted-foreground/60 mb-1 text-[10px] font-semibold tracking-wide uppercase">
            Model notes
          </p>
          <ul className="text-muted-foreground/70 flex flex-col gap-0.5 text-[11px]">
            {capabilities.quirks.map((q) => (
              <li key={q} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">·</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetParameters}
          className="h-7 text-xs"
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
