import { useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProviderStore } from '@/stores/provider-store';
import { useEvalStore } from '@/stores/eval-store';
import { useTranslation } from '@/i18n';
import { sortProvidersByName } from '@/utils/sort-providers';

export function JudgeConfig() {
  const { t } = useTranslation();
  const providers = useProviderStore((s) => s.providers);
  const judgeConfig = useEvalStore((s) => s.judgeConfig);
  const setJudgeEnabled = useEvalStore((s) => s.setJudgeEnabled);
  const setJudgeRunner = useEvalStore((s) => s.setJudgeRunner);
  const setJudgeRubric = useEvalStore((s) => s.setJudgeRubric);
  const isRunning = useEvalStore((s) => s.isRunning);

  const sortedProviders = useMemo(
    () => sortProvidersByName(providers),
    [providers],
  );

  const selectedProvider = sortedProviders.find(
    (p) => p.id === judgeConfig.runner?.providerId,
  );
  const models = selectedProvider?.models ?? [];
  const selectedModel = models.find(
    (m) => m.id === judgeConfig.runner?.modelId,
  );

  const handleProviderChange = (providerId: string | null) => {
    const id = providerId ?? '';
    const provider = sortedProviders.find((p) => p.id === id);
    const firstModelId = provider?.models[0]?.id ?? '';
    setJudgeRunner(
      id && firstModelId ? { providerId: id, modelId: firstModelId } : null,
    );
  };

  const handleModelChange = (modelId: string | null) => {
    if (!judgeConfig.runner || !modelId) return;
    setJudgeRunner({ ...judgeConfig.runner, modelId });
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        {t('eval.judgeDescription')}
      </p>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={judgeConfig.enabled}
          onChange={(e) => setJudgeEnabled(e.target.checked)}
          disabled={isRunning}
          className="rounded"
        />
        <span className="text-foreground">{t('eval.enableJudge')}</span>
        <span className="text-muted-foreground text-xs">
          {t('eval.judgeHint')}
        </span>
      </label>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            {t('eval.judgeProvider')}
          </label>
          <Select
            value={judgeConfig.runner?.providerId ?? ''}
            onValueChange={handleProviderChange}
            disabled={!judgeConfig.enabled || isRunning}
          >
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue placeholder={t('request.provider')}>
                {selectedProvider?.name ?? t('request.provider')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortedProviders.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            {t('eval.judgeModel')}
          </label>
          <Select
            value={judgeConfig.runner?.modelId ?? ''}
            onValueChange={handleModelChange}
            disabled={!judgeConfig.enabled || isRunning}
          >
            <SelectTrigger className="h-7 w-[260px] text-xs">
              <SelectValue placeholder={t('request.model')}>
                {selectedModel?.displayName ?? t('request.model')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {models.length > 0 ? (
                models.map((m) => (
                  <SelectItem key={m.id} value={m.id} title={m.displayName}>
                    {m.displayName}
                  </SelectItem>
                ))
              ) : (
                <div className="text-muted-foreground px-2 py-3 text-center text-xs">
                  {t('request.noModelsAvailable')}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          {t('eval.rubric')}
        </label>
        <Textarea
          value={judgeConfig.rubric}
          onChange={(e) => setJudgeRubric(e.target.value)}
          disabled={!judgeConfig.enabled || isRunning}
          rows={4}
          className="font-mono text-[11px] md:text-[11px]"
        />
      </div>
    </div>
  );
}
