import type { ProviderModel } from '@/types/provider';
import { runtimeFetch } from './runtime-fetch';

const MODELS_API_URL = 'https://models.dev/api.json';
const CACHE_KEY = 'llm-tester-models-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    .sort(([, a], [, b]) =>
      (b.release_date ?? '').localeCompare(a.release_date ?? ''),
    )
    .map(([id, model]) => toProviderModel(id, model));
}

function readCache(): FetchedModels | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw) as {
      timestamp: number;
      data: FetchedModels;
    };
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: FetchedModels): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data }),
    );
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function parseModelsResponse(data: ModelsApiResponse): FetchedModels {
  return {
    openai: data.openai?.models
      ? sortByReleaseDate(
          collectModels(data.openai.models, (_id, m) => isTextChatModel(m)),
        )
      : [],
    anthropic: data.anthropic?.models
      ? sortByReleaseDate(
          collectModels(data.anthropic.models, (_id, m) => isTextChatModel(m)),
        )
      : [],
    openrouter: data.openrouter?.models
      ? [
          ...sortByReleaseDate(
            collectModels(
              data.openrouter.models,
              (id, m) => id.startsWith('openai/') && isTextChatModel(m),
            ),
          ),
          ...sortByReleaseDate(
            collectModels(
              data.openrouter.models,
              (id, m) => id.startsWith('anthropic/') && isTextChatModel(m),
            ),
          ),
        ]
      : [],
  };
}

export async function fetchModelsFromApi(): Promise<FetchedModels> {
  const cached = readCache();
  if (cached) return cached;

  const res = await runtimeFetch(MODELS_API_URL);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data: ModelsApiResponse = await res.json();
  const result = parseModelsResponse(data);
  writeCache(result);
  return result;
}

export async function fetchModelsForProvider(
  providerName: string,
): Promise<ProviderModel[]> {
  const models = await fetchModelsFromApi();
  const key = providerName.toLowerCase() as keyof FetchedModels;
  return models[key] ?? [];
}
