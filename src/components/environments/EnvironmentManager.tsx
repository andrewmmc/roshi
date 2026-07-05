import { useCallback, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
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
  onDelete: (id: string) => Promise<void>;
}) {
  const variableCount = environment.variables.filter((v) => v.key).length;

  return (
    <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{environment.name}</div>
        <p className="text-muted-foreground text-xs">
          {variableCount === 0
            ? 'No variables'
            : `${variableCount} variable${variableCount > 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          tooltip="Edit environment"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3" />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          tooltip="Delete environment"
          onClick={async () => {
            await onDelete(environment.id);
            toast('Environment deleted');
          }}
        >
          <Trash2 className="h-3 w-3" />
        </IconButton>
      </div>
    </div>
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
  const [name, setName] = useState(environment.name);
  const [variables, setVariables] = useState<EnvironmentVariable[]>(
    environment.variables.length ? environment.variables : [createVariable()],
  );

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
        label="Name"
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
          <span className="text-muted-foreground text-xs font-medium">Key</span>
          <span className="text-muted-foreground text-xs font-medium">
            Value
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
              placeholder="name"
              aria-label="Variable key"
              className="font-mono text-xs"
            />
            <Input
              value={variable.value}
              onChange={(event) =>
                updateVariable(variable.id, { value: event.target.value })
              }
              placeholder="value"
              aria-label="Variable value"
              className="font-mono text-xs"
            />
            <IconButton
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              tooltip="Remove variable"
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
          Variable
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await onSave(environment.id, { name, variables });
              toast('Environment saved');
              onCancel();
            }}
            disabled={!name.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EnvironmentSettings() {
  const {
    environments,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    selectEnvironment,
  } = useEnvironments();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    const environment = await addEnvironment('New Environment');
    selectEnvironment(environment.id);
    setEditingId(environment.id);
  }, [addEnvironment, selectEnvironment]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteEnvironment(id);
      if (editingId === id) setEditingId(null);
    },
    [deleteEnvironment, editingId],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="bg-muted/20 flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight">
            Environments
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Define variables and reference them in prompts or headers with{' '}
            {'{{variableName}}'}.
          </p>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {environments.length === 0 ? (
          <EmptyState
            compact
            title="No environments yet"
            description="Create one to start using variables."
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
                  onDelete={handleDelete}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EnvironmentSettingsFooter({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="bg-muted/15 flex shrink-0 items-center justify-end border-t px-5 py-4">
      <Button type="button" variant="outline" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

export function EnvironmentSelector() {
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
        aria-label="Select environment"
        title="Select environment"
        className="h-7 max-w-[150px] min-w-[80px] flex-1 text-xs"
      >
        <SelectValue placeholder="Environment">
          {selectedEnvironment?.name ?? 'Environment'}
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
            No environments available.
          </div>
        )}
        <SelectSeparator />
        <SelectItem value={MANAGE_ENVIRONMENTS_VALUE}>
          <Settings className="h-3 w-3" />
          Manage environments
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
