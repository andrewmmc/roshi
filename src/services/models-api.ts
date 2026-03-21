import type { ProviderModel } from '@/types/provider';

const MODELS_API_URL = 'https://models.dev/api.json';

interface ApiModel {
  id: string;
  name: string;
  release_date?: string;
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

function collectModels(
  models: Record<string, ApiModel>,
  filter: (id: string, model: ApiModel) => boolean,
): [string, ApiModel][] {
  return Object.entries(models).filter(([id, model]) => filter(id, model));
}

function sortByReleaseDate(models: [string, ApiModel][]): ProviderModel[] {
  return models
    .sort(([, a], [, b]) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
    .map(([id, model]) => toProviderModel(id, model));
}

export async function fetchModelsFromApi(): Promise<FetchedModels> {
  const res = await fetch(MODELS_API_URL);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data: ModelsApiResponse = await res.json();

  return {
    openai: data.openai?.models
      ? sortByReleaseDate(collectModels(data.openai.models, (_id, m) => isTextChatModel(m)))
      : [],
    anthropic: data.anthropic?.models
      ? sortByReleaseDate(collectModels(data.anthropic.models, (_id, m) => isTextChatModel(m)))
      : [],
    openrouter: data.openrouter?.models
      ? sortByReleaseDate(collectModels(
          data.openrouter.models,
          (id, m) => (id.startsWith('openai/') || id.startsWith('anthropic/')) && isTextChatModel(m),
        ))
      : [],
  };
}

export async function fetchModelsForProvider(providerName: string): Promise<ProviderModel[]> {
  const models = await fetchModelsFromApi();
  const key = providerName.toLowerCase() as keyof FetchedModels;
  return models[key] ?? [];
}
