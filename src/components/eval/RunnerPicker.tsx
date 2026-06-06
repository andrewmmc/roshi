import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProviderStore } from '@/stores/provider-store';
import { useEvalStore } from '@/stores/eval-store';
import { sortProvidersByName } from '@/utils/sort-providers';

export function RunnerPicker() {
  const providers = useProviderStore((s) => s.providers);
  const runners = useEvalStore((s) => s.runners);
  const addRunner = useEvalStore((s) => s.addRunner);
  const removeRunner = useEvalStore((s) => s.removeRunner);
  const isRunning = useEvalStore((s) => s.isRunning);

  const sortedProviders = useMemo(
    () => sortProvidersByName(providers),
    [providers],
  );

  const firstProvider =
    sortedProviders.find((p) => p.models.length > 0) ?? sortedProviders[0];
  const [providerId, setProviderId] = useState<string>(firstProvider?.id ?? '');
  const provider = sortedProviders.find((p) => p.id === providerId);
  const firstModelId = provider?.models[0]?.id ?? '';
  const [modelId, setModelId] = useState<string>(firstModelId);

  const selectedProvider = sortedProviders.find((p) => p.id === providerId);
  const availableModels = selectedProvider?.models ?? [];
  const selectedModel = availableModels.find((m) => m.id === modelId);

  const handleAdd = () => {
    if (!providerId || !modelId) return;
    addRunner({ providerId, modelId });
  };

  const handleProviderChange = (id: string | null) => {
    const next = id ?? '';
    setProviderId(next);
    const found = sortedProviders.find((p) => p.id === next);
    setModelId(found?.models[0]?.id ?? '');
  };

  const handleModelChange = (id: string | null) => {
    setModelId(id ?? '');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Provider
          </label>
          <Select
            value={providerId}
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
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Model
          </label>
          <Select
            value={modelId}
            onValueChange={handleModelChange}
            disabled={isRunning || availableModels.length === 0}
          >
            <SelectTrigger className="h-7 w-[260px] text-xs">
              <SelectValue placeholder="Model">
                {selectedModel?.displayName ?? 'Model'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => (
                <SelectItem key={m.id} value={m.id} title={m.displayName}>
                  {m.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isRunning || !providerId || !modelId}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add runner
        </Button>
      </div>

      {runners.length === 0 ? (
        <p className="text-muted-foreground text-[11px]">
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
