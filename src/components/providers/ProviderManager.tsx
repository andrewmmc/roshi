import { useEffect, useState, useRef } from 'react';
import {
  Pencil,
  X,
  RotateCcw,
  Download,
  Boxes,
  Plus,
  Trash2,
  Activity,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ProviderForm } from './ProviderForm';
import { useProviders } from '@/hooks/use-providers';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { builtinProviders } from '@/providers/builtins';
import {
  createCustomProviderTemplate,
  MAX_CUSTOM_PROVIDERS,
} from '@/constants/providers';
import { exportProviders } from '@/utils/export';
import { sortProvidersByName } from '@/utils/sort-providers';
import {
  checkProviderHealth,
  type ProviderHealthResult,
} from '@/services/provider-health';
import { toast } from '@/stores/toast-store';
import type { ProviderConfig } from '@/types/provider';

type View = 'list' | 'edit' | 'add';

function getProviderDetails(provider: ProviderConfig): string {
  const builtin = builtinProviders.find((b) => b.name === provider.name);
  const hasApiKey = Boolean(provider.apiKey);
  const hasCustomHeaders = Object.keys(provider.customHeaders ?? {}).length > 0;
  const hasCustomEndpoint =
    builtin &&
    (provider.endpoints.chat !== builtin.endpoints.chat ||
      provider.endpoints.responses !== builtin.endpoints.responses);
  const hasCustomBaseUrl = builtin && provider.baseUrl !== builtin.baseUrl;
  const modelCount = provider.models.length;
  const modelsLabel =
    modelCount === 0
      ? 'No models added'
      : `${modelCount} model${modelCount === 1 ? '' : 's'}`;

  return [
    modelsLabel,
    hasApiKey ? 'API key configured' : 'No API key',
    hasCustomHeaders && 'Custom headers',
    hasCustomEndpoint && 'Custom endpoint',
    hasCustomBaseUrl && 'Custom base URL',
  ]
    .filter(Boolean)
    .join(' · ');
}

function healthStatusLabel(result: ProviderHealthResult): string {
  if (result.status === 'success') {
    return `Healthy via ${result.modelId} (${result.durationMs}ms)`;
  }
  if (result.status === 'skipped') {
    return result.message;
  }
  return result.message;
}

function ProviderList({
  providers,
  checkingProviderId,
  onEditProvider,
  onDeleteProvider,
  onManageModels,
  onHealthCheck,
}: {
  providers: ProviderConfig[];
  checkingProviderId: string | null;
  onEditProvider: (provider: ProviderConfig) => void;
  onDeleteProvider: (provider: ProviderConfig) => void;
  onManageModels: (provider: ProviderConfig) => void;
  onHealthCheck: (provider: ProviderConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      {sortProvidersByName(providers).map((provider) => (
        <div
          key={provider.id}
          className="border-border/70 bg-background/80 flex w-full items-center gap-2 rounded-xl border px-2 py-2"
        >
          <div className="min-w-0 flex-1 px-1 py-0.5">
            <div className="text-sm font-medium tracking-tight">
              {provider.name}
              {!provider.isBuiltIn && (
                <span className="text-muted-foreground ml-1.5 text-[11px] font-normal">
                  Custom
                </span>
              )}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {getProviderDetails(provider)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => onHealthCheck(provider)}
              disabled={checkingProviderId === provider.id}
              tooltip={
                checkingProviderId === provider.id
                  ? 'Checking provider...'
                  : 'Run health check'
              }
              aria-label={`Run health check for ${provider.name}`}
            >
              {checkingProviderId === provider.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => onManageModels(provider)}
              tooltip="Manage models"
              aria-label={`Manage models for ${provider.name}`}
            >
              <Boxes className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => onEditProvider(provider)}
              tooltip="Edit provider"
              aria-label={`Edit provider ${provider.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </IconButton>
            {!provider.isBuiltIn && (
              <IconButton
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onDeleteProvider(provider)}
                tooltip="Remove provider"
                aria-label={`Remove custom provider ${provider.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProviderSettingsFooter({
  view,
  editingProvider,
  resettingProvider,
  providers,
  onClose,
  onBackToList,
  onResetProvider,
  onSubmitForm,
}: {
  view: View;
  editingProvider: ProviderConfig | null;
  resettingProvider: boolean;
  providers: ProviderConfig[];
  onClose: () => void;
  onBackToList: () => void;
  onResetProvider: () => void;
  onSubmitForm: () => void;
}) {
  return (
    <div className="bg-muted/15 flex shrink-0 items-center justify-between border-t px-5 py-4">
      {view === 'list' && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground text-xs"
            onClick={() => exportProviders(providers)}
          >
            <Download className="mr-1 h-3 w-3" />
            Export JSON
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      )}

      {view === 'edit' && editingProvider && (
        <>
          <div>
            {editingProvider.isBuiltIn && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive text-xs"
                disabled={resettingProvider}
                onClick={onResetProvider}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                {resettingProvider ? 'Resetting...' : 'Reset to default'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBackToList}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmitForm}>
              Update
            </Button>
          </div>
        </>
      )}

      {view === 'add' && (
        <>
          <div />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBackToList}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmitForm}>
              Add provider
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function ProviderSettings({
  onClose,
  pendingEditProviderId = null,
  onConsumePendingEdit,
}: {
  onClose: () => void;
  pendingEditProviderId?: string | null;
  onConsumePendingEdit?: () => void;
}) {
  const [view, setView] = useState<View>('list');
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null,
  );
  const [resettingProvider, setResettingProvider] = useState(false);
  const [checkingProviderId, setCheckingProviderId] = useState<string | null>(
    null,
  );
  const [formVersion, setFormVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const openModelMarket = useUiStore((s) => s.openModelMarket);

  const {
    providers,
    addProvider,
    updateProvider,
    deleteProvider,
    resetProvider,
    selectProvider,
  } = useProviders();

  const customProviderCount = providers.filter((p) => !p.isBuiltIn).length;
  const canAddCustomProvider = customProviderCount < MAX_CUSTOM_PROVIDERS;

  // Honour external requests to open a specific provider in edit view.
  useEffect(() => {
    if (!pendingEditProviderId) return;
    const provider = providers.find((p) => p.id === pendingEditProviderId);
    if (provider) {
      setEditingProvider(provider);
      setFormVersion((v) => v + 1);
      setView('edit');
    }
    onConsumePendingEdit?.();
  }, [pendingEditProviderId, providers, onConsumePendingEdit]);

  const handleEdit = async (data: Omit<ProviderConfig, 'id'>) => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, data);
      setEditingProvider(null);
      setView('list');
    }
  };

  const handleAdd = async (data: Omit<ProviderConfig, 'id'>) => {
    try {
      const created = await addProvider(data);
      selectProvider(created.id);
      setView('list');
    } catch (e) {
      if (e instanceof Error && e.message === 'MAX_CUSTOM_PROVIDERS') {
        window.alert(
          `You can add up to ${MAX_CUSTOM_PROVIDERS} custom providers.`,
        );
        return;
      }
      throw e;
    }
  };

  const handleBackToList = () => {
    setEditingProvider(null);
    setView('list');
  };

  const openAddCustomProvider = () => {
    setEditingProvider(null);
    setFormVersion((v) => v + 1);
    setView('add');
  };

  const openEditProvider = (provider: ProviderConfig) => {
    setEditingProvider(provider);
    setView('edit');
  };

  const handleDeleteProvider = (provider: ProviderConfig) => {
    if (window.confirm('Remove this custom provider? This cannot be undone.')) {
      void deleteProvider(provider.id);
    }
  };

  const handleManageModels = (provider: ProviderConfig) => {
    openModelMarket(provider.id);
  };

  const handleHealthCheck = async (provider: ProviderConfig) => {
    setCheckingProviderId(provider.id);
    try {
      const result = await checkProviderHealth(provider);
      const label = healthStatusLabel(result);
      if (result.status === 'success') {
        toast(`${provider.name}: ${label}`, 4000);
      } else if (result.status === 'skipped') {
        toast(`${provider.name}: ${label}`, 4000);
      } else {
        toast(`${provider.name}: ${label}`, 6000);
      }
    } finally {
      setCheckingProviderId(null);
    }
  };

  const handleResetProvider = async () => {
    if (!editingProvider) return;
    setResettingProvider(true);
    try {
      await resetProvider(editingProvider.id);
      const updated = useProviderStore
        .getState()
        .providers.find((p) => p.id === editingProvider.id);
      if (updated) {
        setEditingProvider(updated);
        setFormVersion((v) => v + 1);
      }
    } finally {
      setResettingProvider(false);
    }
  };

  const handleClose = () => {
    setEditingProvider(null);
    setView('list');
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Subheader */}
      <div className="bg-muted/20 flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight">
            {view === 'list' && 'Providers'}
            {view === 'edit' && 'Edit Provider'}
            {view === 'add' && 'Add custom provider'}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {view === 'list' &&
              'Tune credentials and endpoints for each provider. Pick models from the Models tab.'}
            {view === 'edit' &&
              'Update keys, headers, endpoints, and model entries without leaving the composer.'}
            {view === 'add' &&
              'Configure a Chat Completions–compatible endpoint, credentials, and the models you want listed.'}
          </p>
        </div>
        {view === 'list' && (
          <Button
            size="sm"
            disabled={!canAddCustomProvider}
            onClick={openAddCustomProvider}
            title={
              canAddCustomProvider
                ? undefined
                : `You can add up to ${MAX_CUSTOM_PROVIDERS} custom providers.`
            }
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
        {view !== 'list' && (
          <IconButton
            variant="ghost"
            size="icon-sm"
            onClick={handleBackToList}
            tooltip="Back to provider list"
          >
            <X className="h-3.5 w-3.5" />
          </IconButton>
        )}
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'list' && (
          <ProviderList
            providers={providers}
            checkingProviderId={checkingProviderId}
            onEditProvider={openEditProvider}
            onDeleteProvider={handleDeleteProvider}
            onManageModels={handleManageModels}
            onHealthCheck={(provider) => void handleHealthCheck(provider)}
          />
        )}

        {view === 'edit' && editingProvider && (
          <ProviderForm
            key={`${editingProvider.id}-${formVersion}`}
            ref={formRef}
            initialData={editingProvider}
            onSubmit={handleEdit}
            isBuiltIn={editingProvider.isBuiltIn}
          />
        )}

        {view === 'add' && (
          <ProviderForm
            key={`add-${formVersion}`}
            ref={formRef}
            initialData={createCustomProviderTemplate()}
            onSubmit={handleAdd}
            isBuiltIn={false}
          />
        )}
      </div>

      <ProviderSettingsFooter
        view={view}
        editingProvider={editingProvider}
        resettingProvider={resettingProvider}
        providers={providers}
        onClose={handleClose}
        onBackToList={handleBackToList}
        onResetProvider={() => void handleResetProvider()}
        onSubmitForm={() => formRef.current?.requestSubmit()}
      />
    </div>
  );
}
