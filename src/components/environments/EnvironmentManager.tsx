import { useCallback, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/stores/toast-store';
import { useEnvironments } from '@/hooks/use-environments';
import type { Environment, EnvironmentVariable } from '@/types/history';

function createVariable(): EnvironmentVariable {
  return { id: nanoid(), key: '', value: '' };
}

function EnvironmentEditor({
  environment,
  onSave,
  onDelete,
}: {
  environment: Environment;
  onSave: (
    id: string,
    updates: Pick<Environment, 'name' | 'variables'>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
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
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Environment name"
          className="h-7 text-xs"
        />
        <IconButton
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-7 w-7"
          tooltip="Delete environment"
          onClick={async () => {
            await onDelete(environment.id);
            toast('Environment deleted');
          }}
        >
          <Trash2 className="h-3 w-3" />
        </IconButton>
      </div>
      <div className="space-y-2">
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
              className="h-7 font-mono text-xs"
            />
            <Input
              value={variable.value}
              onChange={(event) =>
                updateVariable(variable.id, { value: event.target.value })
              }
              placeholder="value"
              aria-label="Variable value"
              className="h-7 font-mono text-xs"
            />
            <IconButton
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-7 w-7"
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
        <Button
          size="sm"
          onClick={async () => {
            await onSave(environment.id, { name, variables });
            toast('Environment saved');
          }}
          disabled={!name.trim()}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}

export function EnvironmentManager({
  showSelector = true,
  showManageButton = true,
}: {
  showSelector?: boolean;
  showManageButton?: boolean;
}) {
  const {
    environments,
    selectedEnvironmentId,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    selectEnvironment,
  } = useEnvironments();
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState('');

  const selectedEnvironment = useMemo(
    () =>
      environments.find(
        (environment) => environment.id === selectedEnvironmentId,
      ) ?? null,
    [environments, selectedEnvironmentId],
  );

  const handleAdd = useCallback(async () => {
    const environment = await addEnvironment(draftName || 'Local');
    selectEnvironment(environment.id);
    setDraftName('');
    toast('Environment created');
  }, [addEnvironment, draftName, selectEnvironment]);

  return (
    <div className="flex items-center gap-1.5">
      {showSelector && (
        <Select
          value={selectedEnvironmentId ?? 'none'}
          onValueChange={(value) =>
            selectEnvironment(value === 'none' ? null : value)
          }
        >
          <SelectTrigger
            aria-label="Select environment"
            title="Select environment"
            className="h-7 w-[150px] text-xs"
          >
            <SelectValue placeholder="Environment">
              {selectedEnvironment?.name ?? 'No environment'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No environment</SelectItem>
            {environments.map((environment) => (
              <SelectItem key={environment.id} value={environment.id}>
                {environment.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showManageButton && (
        <IconButton
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-7 w-7"
          tooltip="Manage environments"
          onClick={() => setOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </IconButton>
      )}

      {showManageButton && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Environments</DialogTitle>
              <DialogDescription>
                Define variables and reference them in prompts or headers with
                {' {{variableName}}'}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="flex gap-2">
                <Input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Environment name"
                  className="h-8 text-sm"
                />
                <Button size="sm" onClick={handleAdd}>
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>

              {environments.length === 0 ? (
                <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-xs">
                  No environments yet. Create one to start using variables.
                </div>
              ) : (
                <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                  {environments.map((environment) => (
                    <EnvironmentEditor
                      key={environment.id}
                      environment={environment}
                      onSave={updateEnvironment}
                      onDelete={deleteEnvironment}
                    />
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
