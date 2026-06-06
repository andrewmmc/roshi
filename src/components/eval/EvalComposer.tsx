import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const composer = useEvalStore((s) => s.composer);
  const isRunning = useEvalStore((s) => s.isRunning);

  const setSystemPrompt = useEvalStore((s) => s.setSystemPrompt);
  const updateMessage = useEvalStore((s) => s.updateMessage);
  const addMessage = useEvalStore((s) => s.addMessage);
  const removeMessage = useEvalStore((s) => s.removeMessage);
  const setTemperature = useEvalStore((s) => s.setTemperature);
  const setMaxTokens = useEvalStore((s) => s.setMaxTokens);
  const setTopP = useEvalStore((s) => s.setTopP);
  const setStream = useEvalStore((s) => s.setStream);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          System prompt
        </Label>
        <Textarea
          value={composer.systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={isRunning}
          rows={3}
          placeholder="Shared system prompt (optional)"
          className="font-mono text-[12px] md:text-[12px]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
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
              onChange={(e) =>
                updateMessage(index, { content: e.target.value })
              }
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

      <div className="border-border/60 grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4">
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
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
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
      <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
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
