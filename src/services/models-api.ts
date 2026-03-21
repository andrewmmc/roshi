import type { ProviderModel } from '@/types/provider';

const MODELS_API_URL = 'https://models.dev/api.json';

interface ApiModel {
  id: string;
  name: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  limit?: {
    context?: number;
    output?: number;
  };
}

interface ApiProvider {
  id: string;
  name: string;
  models: Record<string, ApiModel>;
}

interface ModelsApiResponse {
  [key: string]: ApiProvider;
}

function toProviderModel(id: string, model: ApiModel): ProviderModel {
  return {
    id,
    name: id,
    displayName: model.name || id,
    supportsStreaming: true,
  };
}

function isTextChatModel(model: ApiModel): boolean {
  const output = model.modalities?.output ?? [];
  return output.includes('text') && !model.id.startsWith('text-embedding');
}

export interface FetchedModels {
  openai: ProviderModel[];
  anthropic: ProviderModel[];
  openrouter: ProviderModel[];
}

export async function fetchModelsFromApi(): Promise<FetchedModels> {
  const res = await fetch(MODELS_API_URL);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data: ModelsApiResponse = await res.json();

  const openaiModels: ProviderModel[] = [];
  const anthropicModels: ProviderModel[] = [];
  const openrouterModels: ProviderModel[] = [];

  // OpenAI models
  if (data.openai?.models) {
    for (const [id, model] of Object.entries(data.openai.models)) {
      if (isTextChatModel(model)) {
        openaiModels.push(toProviderModel(id, model));
      }
    }
  }

  // Anthropic models
  if (data.anthropic?.models) {
    for (const [id, model] of Object.entries(data.anthropic.models)) {
      if (isTextChatModel(model)) {
        anthropicModels.push(toProviderModel(id, model));
      }
    }
  }

  // OpenRouter models — only openai/* and anthropic/* prefixed
  if (data.openrouter?.models) {
    for (const [id, model] of Object.entries(data.openrouter.models)) {
      if ((id.startsWith('openai/') || id.startsWith('anthropic/')) && isTextChatModel(model)) {
        openrouterModels.push(toProviderModel(id, model));
      }
    }
  }

  return {
    openai: openaiModels,
    anthropic: anthropicModels,
    openrouter: openrouterModels,
  };
}

export async function fetchModelsForProvider(providerName: string): Promise<ProviderModel[]> {
  const models = await fetchModelsFromApi();
  const key = providerName.toLowerCase() as keyof FetchedModels;
  return models[key] ?? [];
}
