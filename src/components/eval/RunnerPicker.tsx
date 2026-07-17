import { useMemo, useState } from 'react';
import { Plus, Server, X } from 'lucide-react';
import { supportsModelSelection } from '@/types/provider';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProviderStore } from '@/stores/provider-store';
import { useEvalStore } from '@/stores/eval-store';
import { useUiStore } from '@/stores/ui-store';
import { sortProvidersByName } from '@/utils/sort-providers';

const ADD_PROVIDER_VALUE = '__add_provider__';
const BROWSE_MODELS_VALUE = '__browse_models__';

export function RunnerPicker() {
  const providers = useProviderStore((s) => s.providers);
  const runners = useEvalStore((s) => s.runners);
  const addRunner = useEvalStore((s) => s.addRunner);
  const removeRunner = useEvalStore((s) => s.removeRunner);
  const isRunning = useEvalStore((s) => s.isRunning);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const openModelMarket = useUiStore((s) => s.openModelMarket);

  const sortedProviders = useMemo(
    () => sortProvidersByName(providers),
    [providers],
  );

  const firstProvider =
    sortedProviders.find((p) => p.models.length > 0) ?? sortedProviders[0];
  const [providerId, setProviderId] = useState<string>(firstProvider?.id ?? '');
  const effectiveProviderId = providerId || firstProvider?.id || '';
  const provider = sortedProviders.find((p) => p.id === effectiveProviderId);
  const firstModelId = provider?.models[0]?.id ?? '';
  const [modelId, setModelId] = useState<string>(firstModelId);
  const effectiveModelId = modelId || firstModelId;

  const selectedProvider = sortedProviders.find(
    (p) => p.id === effectiveProviderId,
  );
  const availableModels = selectedProvider?.models ?? [];
  const selectedModel = availableModels.find((m) => m.id === effectiveModelId);
  const providerSupportsModels = supportsModelSelection(
    selectedProvider?.type ?? 'openai-compatible',
  );
  const showBrowseModels = Boolean(selectedProvider && providerSupportsModels);

  const handleAdd = () => {
    if (!effectiveProviderId || !effectiveModelId) return;
    addRunner({ providerId: effectiveProviderId, modelId: effectiveModelId });
  };

  const handleProviderChange = (id: string | null) => {
    if (id === ADD_PROVIDER_VALUE) {
      setSettingsOpen(true, 'providers');
      return;
    }
    const next = id ?? '';
    setProviderId(next);
    const found = sortedProviders.find((p) => p.id === next);
    setModelId(found?.models[0]?.id ?? '');
  };

  const handleModelChange = (id: string | null) => {
    if (id === BROWSE_MODELS_VALUE) {
      openModelMarket(effectiveProviderId || null);
      return;
    }
    setModelId(id ?? '');
  };

  if (providers.length === 0) {
    return (
      <EmptyState
        compact
        icon={Server}
        title="Add a provider API key to create runners."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true, 'providers')}
          >
            <Server className="h-3 w-3" />
            Add API key
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        Each runner is a provider + model pair that receives the same prompt.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            Provider
          </label>
          <Select
            value={effectiveProviderId}
            onValueChange={handleProviderChange}
            disabled={isRunning}
          >
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue placeholder="Provider">
                {selectedProvider?.name ?? 'Provider'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortedProviders.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
              {sortedProviders.length ? <SelectSeparator /> : null}
              <SelectItem value={ADD_PROVIDER_VALUE}>
                <Plus />
                Add provider
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            Model
          </label>
          <Select
            value={effectiveModelId}
            onValueChange={handleModelChange}
            disabled={isRunning}
          >
            <SelectTrigger className="h-7 w-[260px] text-xs">
              <SelectValue placeholder="Model">
                {selectedModel?.displayName ?? 'Model'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableModels.length > 0 ? (
                availableModels.map((m) => (
                  <SelectItem key={m.id} value={m.id} title={m.displayName}>
                    {m.displayName}
                  </SelectItem>
                ))
              ) : (
                <div className="text-muted-foreground px-2 py-3 text-center text-xs">
                  No models available.
                </div>
              )}
              {showBrowseModels ? (
                <>
                  <SelectSeparator />
                  <SelectItem value={BROWSE_MODELS_VALUE}>
                    <Plus />
                    Browse models
                  </SelectItem>
                </>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isRunning || !effectiveProviderId || !effectiveModelId}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add runner
        </Button>
      </div>

      {runners.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No runners yet. Add at least one provider + model to compare.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {runners.map((runner) => (
            <span
              key={runner.id}
              className="border-border/70 bg-muted/40 inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2 text-[11px]"
              title={runner.label}
            >
              <span className="font-mono">{runner.label}</span>
              <button
                type="button"
                aria-label={`Remove ${runner.label}`}
                onClick={() => removeRunner(runner.id)}
                disabled={isRunning}
                className="text-muted-foreground hover:text-foreground inline-flex h-4 w-4 items-center justify-center rounded-full disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
