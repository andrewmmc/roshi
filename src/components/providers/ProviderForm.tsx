import { useState } from 'react';
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
import { Trash2, Plus } from 'lucide-react';
import type { ProviderConfig, ProviderModel } from '@/types/provider';

type ProviderFormData = Omit<ProviderConfig, 'id'>;

interface ProviderFormProps {
  initialData?: ProviderFormData;
  onSubmit: (data: ProviderFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  isBuiltIn?: boolean;
}

const defaultFormData: ProviderFormData = {
  name: '',
  type: 'openai-compatible',
  baseUrl: '',
  auth: { type: 'bearer' },
  apiKey: '',
  endpoints: { chat: '/chat/completions' },
  models: [{ id: '', name: '', displayName: '', supportsStreaming: true }],
  defaults: { temperature: 1, maxTokens: 4096 },
  isBuiltIn: false,
};

export function ProviderForm({ initialData, onSubmit, onCancel, submitLabel = 'Save', isBuiltIn = false }: ProviderFormProps) {
  const [form, setForm] = useState<ProviderFormData>(initialData || defaultFormData);

  const updateField = <K extends keyof ProviderFormData>(key: K, value: ProviderFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateModel = (index: number, updates: Partial<ProviderModel>) => {
    const models = [...form.models];
    models[index] = { ...models[index], ...updates };
    // Sync name with id if name is empty
    if (updates.id && !models[index].name) {
      models[index].name = updates.id;
    }
    updateField('models', models);
  };

  const addModel = () => {
    updateField('models', [...form.models, { id: '', name: '', displayName: '', supportsStreaming: true }]);
  };

  const removeModel = (index: number) => {
    updateField('models', form.models.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up models: remove empty ones, sync names
    const cleanedModels = form.models
      .filter((m) => m.id.trim())
      .map((m) => ({
        ...m,
        name: m.name || m.id,
        displayName: m.displayName || m.id,
      }));
    onSubmit({ ...form, models: cleanedModels });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="My Provider"
            required
            disabled={isBuiltIn}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Type</Label>
          <Select
            value={form.type}
            onValueChange={(val) => updateField('type', val as ProviderConfig['type'])}
            disabled={isBuiltIn}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai-compatible">OpenAI Compatible</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="google-gemini">Google Gemini</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Base URL</Label>
        <Input
          value={form.baseUrl}
          onChange={(e) => updateField('baseUrl', e.target.value)}
          placeholder="https://api.openai.com/v1"
          required
          disabled={isBuiltIn}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Auth Type</Label>
          <Select
            value={form.auth.type}
            onValueChange={(val) => updateField('auth', { ...form.auth, type: val as ProviderConfig['auth']['type'] })}
            disabled={isBuiltIn}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="api-key-header">API Key Header</SelectItem>
              <SelectItem value="query-param">Query Parameter</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.auth.type === 'api-key-header' && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Header Name</Label>
            <Input
              value={form.auth.headerName || ''}
              onChange={(e) => updateField('auth', { ...form.auth, headerName: e.target.value })}
              placeholder="x-api-key"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">API Key</Label>
        <Input
          type="password"
          value={form.apiKey}
          onChange={(e) => updateField('apiKey', e.target.value)}
          placeholder="sk-..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Chat Endpoint</Label>
        <Input
          value={form.endpoints.chat}
          onChange={(e) => updateField('endpoints', { chat: e.target.value })}
          placeholder="/chat/completions"
          disabled={isBuiltIn}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs">Models</Label>
        {form.models.map((model, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={model.id}
              onChange={(e) => updateModel(i, { id: e.target.value })}
              placeholder="model-id"
              className="flex-1 text-sm"
            />
            <Input
              value={model.displayName}
              onChange={(e) => updateModel(i, { displayName: e.target.value })}
              placeholder="Display Name"
              className="flex-1 text-sm"
            />
            {form.models.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeModel(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={addModel}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Model
        </Button>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
