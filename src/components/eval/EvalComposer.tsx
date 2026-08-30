import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/ui/icon-button';
import { Label } from '@/components/ui/label';
import { useEvalStore } from '@/stores/eval-store';
import { MessageEditorView } from '@/components/composer/message-editor-view';
import type { NormalizedMessage } from '@/types/normalized';
import {
  PARAM_INFO,
  TEMP_PRESETS,
} from '@/components/composer/parameter-control-utils';
import {
  CheckboxRow,
  InfoTooltip,
  SectionHeader,
  SliderNumberRow,
} from '@/components/composer/primitives';
import { useTranslation } from '@/i18n';
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
  const { t } = useTranslation();
  const composer = useEvalStore((s) => s.composer);
  const isRunning = useEvalStore((s) => s.isRunning);
  const setSystemPrompt = useEvalStore((s) => s.setSystemPrompt);

  return (
    <Textarea
      value={composer.systemPrompt}
      onChange={(e) => setSystemPrompt(e.target.value)}
      disabled={isRunning}
      rows={3}
      placeholder={t('eval.sharedSystemPrompt')}
      aria-label={t('eval.evalSystemPromptAria')}
      className="bg-muted/20 border-border/50 min-h-[80px] resize-y font-mono text-xs"
    />
  );
}

export function EvalMessagesEditor() {
  const composer = useEvalStore((s) => s.composer);
  const isRunning = useEvalStore((s) => s.isRunning);
  const updateMessage = useEvalStore((s) => s.updateMessage);
  const addMessage = useEvalStore((s) => s.addMessage);
  const removeMessage = useEvalStore((s) => s.removeMessage);
  const addAttachment = useEvalStore((s) => s.addAttachment);
  const removeAttachment = useEvalStore((s) => s.removeAttachment);

  const handleAddMessage = () => {
    const lastRole = composer.messages[composer.messages.length - 1]?.role;
    addMessage(lastRole === 'user' ? 'assistant' : 'user');
  };

  const handleUpdateMessage = (
    index: number,
    patch: Partial<NormalizedMessage>,
  ) => {
    updateMessage(index, patch);
  };

  return (
    <MessageEditorView
      messages={composer.messages}
      disabled={isRunning}
      onUpdateMessage={handleUpdateMessage}
      onRemoveMessage={removeMessage}
      onAddMessage={handleAddMessage}
      onAddAttachment={addAttachment}
      onRemoveAttachment={removeAttachment}
    />
  );
}

export function EvalHeadersEditor() {
  const { t } = useTranslation();
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
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {t('eval.customHeadersLabel')}
      </p>
      {customHeaders.map((header, index) => (
        <div key={header.id} className="flex items-center gap-2">
          <Input
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder={t('request.headerName')}
            disabled={isRunning}
            aria-label={t('request.customHeaderName')}
            className="h-7 flex-1 font-mono text-xs"
          />
          <Input
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder={t('request.headerValue')}
            disabled={isRunning}
            aria-label={t('request.customHeaderValue')}
            className="h-7 flex-1 font-mono text-xs"
          />
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => removeHeader(index)}
            disabled={isRunning || customHeaders.length <= 1}
            tooltip={t('request.removeHeader')}
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
        {t('eval.addHeader')}
      </Button>
    </div>
  );
}

export function EvalParametersEditor() {
  const { t } = useTranslation();
  const composer = useEvalStore((s) => s.composer);
  const isRunning = useEvalStore((s) => s.isRunning);
  const setTemperature = useEvalStore((s) => s.setTemperature);
  const setMaxTokens = useEvalStore((s) => s.setMaxTokens);
  const setTopP = useEvalStore((s) => s.setTopP);
  const setTopK = useEvalStore((s) => s.setTopK);
  const setFrequencyPenalty = useEvalStore((s) => s.setFrequencyPenalty);
  const setPresencePenalty = useEvalStore((s) => s.setPresencePenalty);
  const setParamEnabled = useEvalStore((s) => s.setParamEnabled);
  const setStream = useEvalStore((s) => s.setStream);
  const resetParameters = useEvalStore((s) => s.resetParameters);
  const enabled = composer.paramEnabled;
  const maxTokensControlsDisabled = isRunning || !enabled.maxTokens;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground/70 text-xs leading-snug">
        {t('request.paramsIntro')}
      </p>
      <SectionHeader>{t('request.sampling')}</SectionHeader>

      <div className="flex flex-col gap-1.5">
        <SliderNumberRow
          label={t('request.temperature')}
          paramKey="temperature"
          value={composer.temperature}
          onChange={setTemperature}
          min={TEMPERATURE_MIN}
          max={TEMPERATURE_MAX}
          step={0.01}
          disabled={isRunning}
          enabled={enabled.temperature}
          onEnabledChange={(next) => setParamEnabled('temperature', next)}
          enableDisabled={isRunning}
        />
        <div className="flex gap-1 pl-0">
          {TEMP_PRESETS.map((preset) => (
            <Button
              key={preset.labelKey}
              variant="outline"
              size="xs"
              title={t(preset.titleKey)}
              aria-pressed={
                enabled.temperature &&
                Math.abs(composer.temperature - preset.value) < 0.001
              }
              onClick={() => {
                setParamEnabled('temperature', true);
                setTemperature(preset.value);
              }}
              disabled={isRunning}
              className={`flex-1 px-1 transition-colors ${
                enabled.temperature &&
                Math.abs(composer.temperature - preset.value) < 0.001
                  ? 'bg-accent text-accent-foreground'
                  : ''
              }`}
            >
              {t(preset.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      <SliderNumberRow
        label={t('request.topP')}
        paramKey="top-p"
        value={composer.topP}
        onChange={setTopP}
        min={TOP_P_MIN}
        max={TOP_P_MAX}
        step={0.01}
        disabled={isRunning}
        enabled={enabled.topP}
        onEnabledChange={(next) => setParamEnabled('topP', next)}
        enableDisabled={isRunning}
      />
      <SliderNumberRow
        label={t('request.topK')}
        paramKey="top-k"
        value={composer.topK}
        onChange={(value) => setTopK(Math.max(0, Math.round(value)))}
        min={0}
        max={500}
        step={1}
        decimals={0}
        disabled={isRunning}
        enabled={enabled.topK}
        onEnabledChange={(next) => setParamEnabled('topK', next)}
        enableDisabled={isRunning}
      />

      <SectionHeader>{t('request.penalties')}</SectionHeader>

      <SliderNumberRow
        label={t('request.frequencyPenalty')}
        paramKey="frequency-penalty"
        value={composer.frequencyPenalty}
        onChange={setFrequencyPenalty}
        min={FREQUENCY_PENALTY_MIN}
        max={FREQUENCY_PENALTY_MAX}
        step={0.01}
        disabled={isRunning}
        enabled={enabled.frequencyPenalty}
        onEnabledChange={(next) => setParamEnabled('frequencyPenalty', next)}
        enableDisabled={isRunning}
      />
      <SliderNumberRow
        label={t('request.presencePenalty')}
        paramKey="presence-penalty"
        value={composer.presencePenalty}
        onChange={setPresencePenalty}
        min={PRESENCE_PENALTY_MIN}
        max={PRESENCE_PENALTY_MAX}
        step={0.01}
        disabled={isRunning}
        enabled={enabled.presencePenalty}
        onEnabledChange={(next) => setParamEnabled('presencePenalty', next)}
        enableDisabled={isRunning}
      />

      <SectionHeader>{t('request.output')}</SectionHeader>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <input
              type="checkbox"
              checked={enabled.maxTokens}
              onChange={(e) => setParamEnabled('maxTokens', e.target.checked)}
              disabled={isRunning}
              aria-label={t('request.includeMaxTokens')}
              className="rounded"
            />
            <Label
              htmlFor="eval-param-max-tokens"
              className={`text-xs ${maxTokensControlsDisabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
            >
              {t('request.maxTokens')}
            </Label>
            <InfoTooltip content={t(PARAM_INFO['max-tokens'])} />
          </div>
          <Input
            id="eval-param-max-tokens"
            type="number"
            value={composer.maxTokens}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10);
              setMaxTokens(Number.isFinite(next) ? Math.max(1, next) : 1);
            }}
            className="h-6 w-20 font-mono text-xs"
            min={1}
            max={2_000_000}
            disabled={maxTokensControlsDisabled}
          />
        </div>
      </div>

      <CheckboxRow
        label={t('request.stream')}
        paramKey="stream"
        checked={composer.stream}
        onChange={setStream}
        disabled={isRunning}
      />

      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetParameters}
          disabled={isRunning}
        >
          {t('request.resetToDefaults')}
        </Button>
      </div>
    </div>
  );
}
