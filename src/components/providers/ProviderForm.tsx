import { useState, type Ref } from 'react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HeaderListEditor,
  type HeaderEntry,
} from '@/components/ui/header-list-editor';
import { headersToRecord, recordToHeaders } from '@/utils/headers';
import { Trash2, Plus } from 'lucide-react';
import {
  getDefaultProtocolForProviderType,
  supportsModelSelection,
} from '@/types/provider';
import type { ProviderConfig, ProviderModel } from '@/types/provider';
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '@/constants/defaults';
import { nanoid } from 'nanoid';

type ProviderFormData = Omit<ProviderConfig, 'id'>;
type FormModel = ProviderModel & { _formKey: string };

interface ProviderFormProps {
  ref?: Ref<HTMLFormElement>;
  initialData?: ProviderFormData;
  onSubmit: (data: ProviderFormData) => void;
  isBuiltIn?: boolean;
}

const defaultFormData: ProviderFormData = {
  name: '',
  type: 'openai-compatible',
  protocol: 'openai-compatible-chat',
  baseUrl: '',
  auth: { type: 'bearer' },
  apiKey: '',
  endpoints: { chat: '/chat/completions' },
  models: [
    {
      id: '',
      name: '',
      displayName: '',
      supportsStreaming: true,
      source: 'manual',
    },
  ],
  defaults: { temperature: DEFAULT_TEMPERATURE, maxTokens: DEFAULT_MAX_TOKENS },
  isBuiltIn: false,
  customHeaders: {},
};

export function ProviderForm({
  ref,
  initialData,
  onSubmit,
  isBuiltIn = false,
}: ProviderFormProps) {
  const [form, setForm] = useState<ProviderFormData>(
    initialData || defaultFormData,
  );

  const toFormModels = (models: ProviderModel[]): FormModel[] =>
    models.map((m) => ({ ...m, _formKey: nanoid() }));

  const [formModels, setFormModels] = useState<FormModel[]>(() =>
    toFormModels((initialData || defaultFormData).models),
  );

  // Initialize header entries from initialData once, then track as separate state
  // This prevents ID regeneration on every render which causes input focus loss
  const [headerEntries, setHeaderEntries] = useState<HeaderEntry[]>(() => {
    return recordToHeaders(initialData?.customHeaders);
  });

  const updateHeaderEntries = (entries: HeaderEntry[]) => {
    setHeaderEntries(entries);
  };

  const updateField = <K extends keyof ProviderFormData>(
    key: K,
    value: ProviderFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateProviderType = (type: ProviderConfig['type']) => {
    setForm((prev) => ({
      ...prev,
      type,
      protocol: getDefaultProtocolForProviderType(type, prev.name),
    }));
  };

  const updateModel = (index: number, updates: Partial<ProviderModel>) => {
    setFormModels((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      if (updates.id && !next[index].name) {
        next[index].name = updates.id;
      }
      return next;
    });
  };

  const addModel = () => {
    setFormModels((prev) => [
      ...prev,
      {
        id: '',
        name: '',
        displayName: '',
        supportsStreaming: true,
        source: 'manual',
        _formKey: nanoid(),
      },
    ]);
  };

  const removeModel = (index: number) => {
    setFormModels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For built-in providers, the Models section is hidden and managed via the
    // Model Market; preserve whatever models the provider currently holds.
    const cleanedModels = isBuiltIn
      ? (initialData?.models ?? form.models)
      : formModels
          .filter((m) => m.id.trim())
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ _formKey, ...m }) => ({
            ...m,
            name: m.name || m.id,
            displayName: m.displayName || m.id,
            source: m.source ?? 'manual',
          }));
    // Convert header entries to record for submission
    const customHeaders = headersToRecord(headerEntries);
    onSubmit({ ...form, models: cleanedModels, customHeaders });
  };

  return (
    <form ref={ref} onSubmit={handleSubmit} data-1p-ignore data-lp-ignore>
      <div className="space-y-4 px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" htmlFor="provider-name">
            <Input
              id="provider-name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="My Provider"
              required
              disabled={isBuiltIn}
              className="w-full"
            />
          </Field>
          <Field label="Type" htmlFor="provider-type">
            <Select
              value={form.type}
              onValueChange={(val) =>
                updateProviderType(val as ProviderConfig['type'])
              }
              disabled={isBuiltIn}
            >
              <SelectTrigger id="provider-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai-compatible">
                  OpenAI Compatible
                </SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google-gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {form.type === 'openai-compatible' && (
          <Field label="Protocol" htmlFor="provider-protocol">
            <Select
              value={form.protocol ?? 'openai-compatible-chat'}
              onValueChange={(val) =>
                updateField('protocol', val as ProviderConfig['protocol'])
              }
              disabled={isBuiltIn}
            >
              <SelectTrigger id="provider-protocol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai-compatible-chat">
                  OpenAI-compatible Chat Completions
                </SelectItem>
                <SelectItem value="openai-chat-completions">
                  OpenAI Chat Completions
                </SelectItem>
                <SelectItem value="openai-responses">
                  OpenAI Responses
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field label="Base URL" htmlFor="provider-base-url">
          <Input
            id="provider-base-url"
            value={form.baseUrl}
            onChange={(e) => updateField('baseUrl', e.target.value)}
            placeholder="https://api.openai.com/v1"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Auth Type" htmlFor="provider-auth-type">
            <Select
              value={form.auth.type}
              onValueChange={(val) =>
                updateField('auth', {
                  ...form.auth,
                  type: val as ProviderConfig['auth']['type'],
                })
              }
              disabled={isBuiltIn}
            >
              <SelectTrigger id="provider-auth-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api-key-header">API Key Header</SelectItem>
                <SelectItem value="query-param">Query Parameter</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {form.auth.type === 'api-key-header' && (
            <Field label="Header Name" htmlFor="provider-auth-header-name">
              <Input
                id="provider-auth-header-name"
                value={form.auth.headerName || ''}
                onChange={(e) =>
                  updateField('auth', {
                    ...form.auth,
                    headerName: e.target.value,
                  })
                }
                placeholder="x-api-key"
              />
            </Field>
          )}
        </div>

        <Field label="API Key" htmlFor="provider-api-key">
          <PasswordInput
            id="provider-api-key"
            value={form.apiKey}
            onChange={(e) => updateField('apiKey', e.target.value)}
            placeholder="sk-..."
            data-1p-ignore
            data-lp-ignore
          />
        </Field>

        <div className="flex flex-col gap-2">
          <HeaderListEditor
            headers={headerEntries}
            onChange={updateHeaderEntries}
            label="Custom Headers"
            placeholderKey="x-custom-header"
            placeholderValue="header-value"
          />
        </div>

        <Field label="Chat Endpoint" htmlFor="provider-chat-endpoint">
          <Input
            id="provider-chat-endpoint"
            value={form.endpoints.chat}
            onChange={(e) =>
              updateField('endpoints', {
                ...form.endpoints,
                chat: e.target.value,
              })
            }
            placeholder="/chat/completions"
          />
        </Field>

        {form.type === 'openai-compatible' && (
          <Field
            label="Responses Endpoint"
            htmlFor="provider-responses-endpoint"
          >
            <Input
              id="provider-responses-endpoint"
              value={form.endpoints.responses ?? ''}
              onChange={(e) =>
                updateField('endpoints', {
                  ...form.endpoints,
                  responses: e.target.value,
                })
              }
              placeholder="/responses"
            />
          </Field>
        )}

        {!isBuiltIn && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Models</Label>
            {formModels.map((model, i) => (
              <div key={model._formKey} className="flex items-center gap-2">
                <Input
                  aria-label={`Model ID ${i + 1}`}
                  value={model.id}
                  onChange={(e) => updateModel(i, { id: e.target.value })}
                  placeholder="model-id"
                  className="flex-1 text-sm"
                />
                <Input
                  aria-label={`Model display name ${i + 1}`}
                  value={model.displayName}
                  onChange={(e) =>
                    updateModel(i, { displayName: e.target.value })
                  }
                  placeholder="Display Name"
                  className="flex-1 text-sm"
                />
                {formModels.length > 1 && (
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() => removeModel(i)}
                    tooltip="Remove model"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={addModel}
              disabled={!supportsModelSelection(form.type)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Model
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
