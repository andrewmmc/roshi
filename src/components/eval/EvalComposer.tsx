import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/ui/icon-button';
import { Label } from '@/components/ui/label';
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
import { useEvalStore } from '@/stores/eval-store';
import {
  PARAM_INFO,
  TEMP_PRESETS,
} from '@/components/composer/parameter-control-utils';
import {
  FREQUENCY_PENALTY_MAX,
  FREQUENCY_PENALTY_MIN,
  PRESENCE_PENALTY_MAX,
  PRESENCE_PENALTY_MIN,
  TEMPERATURE_MAX,
  TEMPERATURE_MIN,
  TOP_P_MAX,
  TOP_P_MIN,
} from '@/constants/defaults';

export function EvalComposer() {
  return (
    <div className="flex flex-col gap-3">
      <EvalSystemPromptEditor />
      <EvalMessagesEditor />
      <EvalParametersEditor />
    </div>
  );
}

export function EvalSystemPromptEditor() {
  const composer = useEvalStore((s) => s.composer);
  const isRunning = useEvalStore((s) => s.isRunning);
  const setSystemPrompt = useEvalStore((s) => s.setSystemPrompt);

  return (
    <Textarea
      value={composer.systemPrompt}
      onChange={(e) => setSystemPrompt(e.target.value)}
      disabled={isRunning}
      rows={3}
      placeholder="Shared system prompt (optional)"
      aria-label="Eval system prompt"
      className="bg-muted/20 border-border/50 min-h-[80px] resize-y font-mono text-[12px] md:text-[12px]"
    />
  );
}

export function EvalMessagesEditor() {
  const composer = useEvalStore((s) => s.composer);
  const isRunning = useEvalStore((s) => s.isRunning);
  const updateMessage = useEvalStore((s) => s.updateMessage);
  const addMessage = useEvalStore((s) => s.addMessage);
  const removeMessage = useEvalStore((s) => s.removeMessage);

  const handleAddMessage = () => {
    const lastRole = composer.messages[composer.messages.length - 1]?.role;
    addMessage(lastRole === 'user' ? 'assistant' : 'user');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {composer.messages.map((msg, index) => (
          <div key={msg.id} className="flex items-start gap-2">
            <Select
              value={msg.role}
              onValueChange={(role) => {
                if (!role) return;
                updateMessage(index, {
                  role: role as 'user' | 'assistant' | 'system',
                });
              }}
              disabled={isRunning}
            >
              <SelectTrigger
                aria-label={`Role for eval message ${index + 1}`}
                className="h-7 w-[100px] shrink-0 text-xs capitalize"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <div className="min-w-0 flex-1">
              <Textarea
                value={msg.content}
                onChange={(e) =>
                  updateMessage(index, { content: e.target.value })
                }
                disabled={isRunning}
                aria-label={`${msg.role} eval message ${index + 1}`}
                placeholder={`${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)} message...`}
                rows={2}
                className="bg-muted/20 border-border/50 min-h-[52px] resize-y font-mono text-[12px] md:text-[12px]"
              />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeMessage(index)}
              disabled={isRunning || composer.messages.length <= 1}
              aria-label={`Remove eval message ${index + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-7 self-start text-xs"
        onClick={handleAddMessage}
        disabled={isRunning}
      >
        <Plus className="mr-1.5 h-3 w-3" />
        Add Message
      </Button>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-0.5 flex items-center gap-2">
      <span className="text-muted-foreground/50 text-[11px] font-semibold tracking-widest uppercase">
        {children}
      </span>
      <div className="bg-border/50 h-px flex-1" />
    </div>
  );
}

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
        <TooltipContent side="right" className="max-w-60 text-xs leading-snug">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
}) {
  const inputId = `eval-param-${paramKey}`;
  const info = PARAM_INFO[paramKey];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Label
            htmlFor={inputId}
            className={`text-xs whitespace-nowrap ${disabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
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
          className="h-6 w-20 font-mono text-[11px] md:text-[11px]"
        />
      </div>
      <Slider
        value={[value]}
        onValueChange={(nextValue) => {
          const next = Array.isArray(nextValue)
            ? nextValue[0]
            : (nextValue as number);
          if (next !== undefined) onChange(next);
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

function CheckboxRow({
  label,
  paramKey,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  paramKey: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const inputId = `eval-param-${paramKey}`;
  const info = PARAM_INFO[paramKey];

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-1.5">
        <Label
          htmlFor={inputId}
          className={`text-xs ${disabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
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
        className="rounded"
      />
    </div>
  );
}

export function EvalHeadersEditor() {
  const customHeaders = useEvalStore((s) => s.composer.customHeaders);
  const setCustomHeaders = useEvalStore((s) => s.setCustomHeaders);
  const isRunning = useEvalStore((s) => s.isRunning);

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { id: nanoid(), key: '', value: '' }]);
  };

  const updateKey = (index: number, key: string) => {
    setCustomHeaders(
      customHeaders.map((h, i) => (i === index ? { ...h, key } : h)),
    );
  };

  const updateValue = (index: number, value: string) => {
    setCustomHeaders(
      customHeaders.map((h, i) => (i === index ? { ...h, value } : h)),
    );
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {customHeaders.map((header, index) => (
        <div key={header.id} className="flex items-center gap-2">
          <Input
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder="Header name"
            disabled={isRunning}
            aria-label="Custom header name"
            className="h-7 flex-1 font-mono text-[12px] md:text-[12px]"
          />
          <Input
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder="Header value"
            disabled={isRunning}
            aria-label="Custom header value"
            className="h-7 flex-1 font-mono text-[12px] md:text-[12px]"
          />
          <IconButton
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
            onClick={() => removeHeader(index)}
            disabled={isRunning || customHeaders.length <= 1}
            tooltip="Remove header"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={addHeader}
        disabled={isRunning}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Header
      </Button>
    </div>
  );
}

export function EvalParametersEditor() {
  const composer = useEvalStore((s) => s.composer);
  const isRunning = useEvalStore((s) => s.isRunning);
  const setTemperature = useEvalStore((s) => s.setTemperature);
  const setMaxTokens = useEvalStore((s) => s.setMaxTokens);
  const setTopP = useEvalStore((s) => s.setTopP);
  const setTopK = useEvalStore((s) => s.setTopK);
  const setFrequencyPenalty = useEvalStore((s) => s.setFrequencyPenalty);
  const setPresencePenalty = useEvalStore((s) => s.setPresencePenalty);
  const setStream = useEvalStore((s) => s.setStream);

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader>Sampling</SectionHeader>

      <div className="flex flex-col gap-1.5">
        <SliderNumberRow
          label="Temperature"
          paramKey="temperature"
          value={composer.temperature}
          onChange={setTemperature}
          min={TEMPERATURE_MIN}
          max={TEMPERATURE_MAX}
          step={0.01}
          disabled={isRunning}
        />
        <div className="flex gap-1 pl-0">
          {TEMP_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              title={preset.title}
              aria-pressed={
                Math.abs(composer.temperature - preset.value) < 0.001
              }
              onClick={() => setTemperature(preset.value)}
              disabled={isRunning}
              className={`h-5 flex-1 px-0 text-[11px] transition-colors ${
                Math.abs(composer.temperature - preset.value) < 0.001
                  ? 'bg-accent border-accent-foreground/20 text-accent-foreground'
                  : ''
              }`}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <SliderNumberRow
        label="Top P"
        paramKey="top-p"
        value={composer.topP}
        onChange={setTopP}
        min={TOP_P_MIN}
        max={TOP_P_MAX}
        step={0.01}
        disabled={isRunning}
      />
      <SliderNumberRow
        label="Top K"
        paramKey="top-k"
        value={composer.topK}
        onChange={(value) => setTopK(Math.max(0, Math.round(value)))}
        min={0}
        max={500}
        step={1}
        decimals={0}
        disabled={isRunning}
      />

      <SectionHeader>Penalties</SectionHeader>

      <SliderNumberRow
        label="Frequency Penalty"
        paramKey="frequency-penalty"
        value={composer.frequencyPenalty}
        onChange={setFrequencyPenalty}
        min={FREQUENCY_PENALTY_MIN}
        max={FREQUENCY_PENALTY_MAX}
        step={0.01}
        disabled={isRunning}
      />
      <SliderNumberRow
        label="Presence Penalty"
        paramKey="presence-penalty"
        value={composer.presencePenalty}
        onChange={setPresencePenalty}
        min={PRESENCE_PENALTY_MIN}
        max={PRESENCE_PENALTY_MAX}
        step={0.01}
        disabled={isRunning}
      />

      <SectionHeader>Output</SectionHeader>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <Label
              htmlFor="eval-param-max-tokens"
              className={`text-xs ${isRunning ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
            >
              Max Tokens
            </Label>
            <InfoTooltip content={PARAM_INFO['max-tokens']} />
          </div>
          <Input
            id="eval-param-max-tokens"
            type="number"
            value={composer.maxTokens}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10);
              setMaxTokens(Number.isFinite(next) ? Math.max(1, next) : 1);
            }}
            className="h-6 w-20 font-mono text-[11px] md:text-[11px]"
            min={1}
            max={2_000_000}
            disabled={isRunning}
          />
        </div>
      </div>

      <CheckboxRow
        label="Stream"
        paramKey="stream"
        checked={composer.stream}
        onChange={setStream}
        disabled={isRunning}
      />
    </div>
  );
}
