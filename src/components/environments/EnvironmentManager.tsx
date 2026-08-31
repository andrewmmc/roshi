import { useCallback, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/stores/toast-store';
import { useEnvironments } from '@/hooks/use-environments';
import { useUiStore } from '@/stores/ui-store';
import type { Environment, EnvironmentVariable } from '@/types/history';
import { useTranslation } from '@/i18n';

const MANAGE_ENVIRONMENTS_VALUE = '__manage_environments__';

function createVariable(): EnvironmentVariable {
  return { id: nanoid(), key: '', value: '' };
}

function EnvironmentCard({
  environment,
  onEdit,
  onDelete,
}: {
  environment: Environment;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const variableCount = environment.variables.filter((v) => v.key).length;

  return (
    <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{environment.name}</div>
        <p className="text-muted-foreground text-xs">
          {variableCount === 0
            ? t('environments.noVariables')
            : t(
                variableCount === 1
                  ? 'environments.variableCountSingular'
                  : 'environments.variableCount',
                { count: variableCount },
              )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          tooltip={t('environments.edit')}
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3" />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          tooltip={t('environments.delete')}
          onClick={() => onDelete(environment.id)}
        >
          <Trash2 className="h-3 w-3" />
        </IconButton>
      </div>
    </div>
  );
}

function environmentIsDirty(
  original: Environment,
  name: string,
  variables: EnvironmentVariable[],
): boolean {
  if (name !== original.name) return true;
  if (variables.length !== original.variables.length) return true;
  return variables.some(
    (variable, index) =>
      variable.key !== original.variables[index]?.key ||
      variable.value !== original.variables[index]?.value,
  );
}

function EnvironmentEditor({
  environment,
  onSave,
  onCancel,
}: {
  environment: Environment;
  onSave: (
    id: string,
    updates: Pick<Environment, 'name' | 'variables'>,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(environment.name);
  const [variables, setVariables] = useState<EnvironmentVariable[]>(
    environment.variables.length ? environment.variables : [createVariable()],
  );
  const [showDiscard, setShowDiscard] = useState(false);

  const handleCancel = () => {
    if (environmentIsDirty(environment, name, variables)) {
      setShowDiscard(true);
      return;
    }
    onCancel();
  };

  const updateVariable = useCallback(
    (id: string, updates: Partial<EnvironmentVariable>) => {
      setVariables((current) =>
        current.map((variable) =>
          variable.id === id ? { ...variable, ...updates } : variable,
        ),
      );
    },
    [],
  );

  const removeVariable = useCallback((id: string) => {
    setVariables((current) => {
      const next = current.filter((variable) => variable.id !== id);
      return next.length ? next : [createVariable()];
    });
  }, []);

  return (
    <div className="bg-muted/20 rounded-xl border p-3">
      <Field
        label={t('common.name')}
        htmlFor={`env-name-${environment.id}`}
        className="mb-3"
      >
        <Input
          id={`env-name-${environment.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            {t('environments.key')}
          </span>
          <span className="text-muted-foreground text-xs font-medium">
            {t('common.value')}
          </span>
          <span className="w-7" />
        </div>
        {variables.map((variable) => (
          <div
            key={variable.id}
            className="grid grid-cols-[1fr_1fr_auto] gap-2"
          >
            <Input
              value={variable.key}
              onChange={(event) =>
                updateVariable(variable.id, { key: event.target.value })
              }
              placeholder={t('common.name')}
              aria-label={t('environments.variableKey')}
              className="font-mono text-xs"
            />
            <Input
              value={variable.value}
              onChange={(event) =>
                updateVariable(variable.id, { value: event.target.value })
              }
              placeholder={t('common.value')}
              aria-label={t('environments.variableValue')}
              className="font-mono text-xs"
            />
            <IconButton
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              tooltip={t('environments.removeVariable')}
              onClick={() => removeVariable(variable.id)}
            >
              <Trash2 className="h-3 w-3" />
            </IconButton>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setVariables((current) => [...current, createVariable()])
          }
        >
          <Plus className="h-3 w-3" />
          {t('environments.variable')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await onSave(environment.id, { name, variables });
              toast(t('environments.saved'));
              onCancel();
            }}
            disabled={!name.trim()}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>

      <ConfirmDiscardDialog
        open={showDiscard}
        onOpenChange={setShowDiscard}
        onConfirm={onCancel}
        title={t('environments.discardChanges')}
        description={t('environments.unsavedChanges')}
      />
    </div>
  );
}

export function EnvironmentSettings() {
  const { t } = useTranslation();
  const {
    environments,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    selectEnvironment,
  } = useEnvironments();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAdd = useCallback(async () => {
    const environment = await addEnvironment(t('environments.new'));
    selectEnvironment(environment.id);
    setEditingId(environment.id);
  }, [addEnvironment, selectEnvironment, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteEnvironment(id);
      if (editingId === id) setEditingId(null);
    },
    [deleteEnvironment, editingId],
  );

  const requestDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    await handleDelete(pendingDeleteId);
    toast(t('environments.deleted'));
    setPendingDeleteId(null);
  }, [handleDelete, pendingDeleteId, t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="bg-muted/20 flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight">
            {t('settings.environments')}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t('environments.description')}
          </p>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-3 w-3" />
          {t('common.add')}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {environments.length === 0 ? (
          <EmptyState
            compact
            title={t('environments.empty')}
            description={t('environments.createHint')}
          />
        ) : (
          <div className="space-y-2">
            {environments.map((environment) =>
              editingId === environment.id ? (
                <EnvironmentEditor
                  key={environment.id}
                  environment={environment}
                  onSave={updateEnvironment}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <EnvironmentCard
                  key={environment.id}
                  environment={environment}
                  onEdit={() => setEditingId(environment.id)}
                  onDelete={requestDelete}
                />
              ),
            )}
          </div>
        )}
      </div>

      <ConfirmDiscardDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDelete}
        title={t('environments.deleteQuestion')}
        description={t('environments.deleteWarning')}
      />
    </div>
  );
}

export function EnvironmentSettingsFooter({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-muted/15 flex shrink-0 items-center justify-end border-t px-5 py-4">
      <Button type="button" variant="outline" onClick={onClose}>
        {t('common.close')}
      </Button>
    </div>
  );
}

export function EnvironmentSelector() {
  const { t } = useTranslation();
  const { environments, selectedEnvironmentId, selectEnvironment } =
    useEnvironments();
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  const selectedEnvironment = useMemo(
    () =>
      environments.find(
        (environment) => environment.id === selectedEnvironmentId,
      ) ?? null,
    [environments, selectedEnvironmentId],
  );
  const handleEnvironmentChange = (value: string | null) => {
    if (value === MANAGE_ENVIRONMENTS_VALUE) {
      setSettingsOpen(true, 'environments');
      return;
    }

    selectEnvironment(value);
  };

  return (
    <Select
      value={selectedEnvironmentId ?? ''}
      onValueChange={handleEnvironmentChange}
    >
      <SelectTrigger
        aria-label={t('environments.select')}
        title={t('environments.select')}
        className="h-8 max-w-[150px] min-w-[80px] flex-1 text-[13px]"
      >
        <SelectValue placeholder={t('environments.environment')}>
          {selectedEnvironment?.name ?? t('environments.environment')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-56">
        {environments.length ? (
          environments.map((environment) => (
            <SelectItem key={environment.id} value={environment.id}>
              {environment.name}
            </SelectItem>
          ))
        ) : (
          <div className="text-muted-foreground px-2 py-3 text-center text-xs">
            {t('environments.noneAvailable')}
          </div>
        )}
        <SelectSeparator />
        <SelectItem value={MANAGE_ENVIRONMENTS_VALUE}>
          <Settings className="h-3 w-3" />
          {t('environments.manage')}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
