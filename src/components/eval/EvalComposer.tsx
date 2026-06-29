import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/ui/icon-button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEvalStore } from '@/stores/eval-store';
import {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          Messages
        </Label>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="xs"
            disabled={isRunning}
            onClick={() => addMessage('user')}
          >
            <Plus className="mr-1 h-3 w-3" />
            User
          </Button>
          <Button
            variant="outline"
            size="xs"
            disabled={isRunning}
            onClick={() => addMessage('assistant')}
          >
            <Plus className="mr-1 h-3 w-3" />
            Assistant
          </Button>
        </div>
      </div>

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
            <SelectTrigger className="h-7 w-[100px] shrink-0 text-xs capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="assistant">assistant</SelectItem>
              <SelectItem value="system">system</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={msg.content}
            onChange={(e) => updateMessage(index, { content: e.target.value })}
            disabled={isRunning}
            placeholder={`${msg.role} message…`}
            rows={2}
            className="bg-muted/20 border-border/50 min-h-[52px] flex-1 resize-y font-mono text-[12px] md:text-[12px]"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeMessage(index)}
            disabled={isRunning || composer.messages.length <= 1}
            aria-label={`Remove message ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
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
      <p className="text-muted-foreground text-xs">
        These custom headers are sent with every eval runner request.
      </p>
      {customHeaders.map((header, index) => (
        <div key={header.id} className="flex items-center gap-2">
          <Input
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder="Header name"
            disabled={isRunning}
            className="h-7 flex-1 font-mono text-[12px] md:text-[12px]"
          />
          <Input
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder="Header value"
            disabled={isRunning}
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
  const setStream = useEvalStore((s) => s.setStream);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <NumberField
        label="Temperature"
        value={composer.temperature}
        onChange={setTemperature}
        min={TEMPERATURE_MIN}
        max={TEMPERATURE_MAX}
        step={0.01}
        disabled={isRunning}
      />
      <NumberField
        label="Max tokens"
        value={composer.maxTokens}
        onChange={(v) => setMaxTokens(Math.max(1, Math.round(v)))}
        min={1}
        max={2_000_000}
        step={1}
        disabled={isRunning}
      />
      <NumberField
        label="Top P"
        value={composer.topP}
        onChange={setTopP}
        min={TOP_P_MIN}
        max={TOP_P_MAX}
        step={0.01}
        disabled={isRunning}
      />
      <label className="flex flex-col gap-1 text-[11px]">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          Stream
        </span>
        <input
          type="checkbox"
          checked={composer.stream}
          onChange={(e) => setStream(e.target.checked)}
          disabled={isRunning}
          className="h-4 w-4 rounded"
        />
      </label>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px]">
      <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </span>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const next = parseFloat(e.target.value);
          if (Number.isFinite(next))
            onChange(Math.min(max, Math.max(min, next)));
        }}
        className="h-7 font-mono text-[11px] md:text-[11px]"
      />
    </label>
  );
}
