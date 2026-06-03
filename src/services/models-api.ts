import type { ModelModality } from '@/models/capabilities';
import type { ModelCapabilityOverrides } from '@/types/provider';
import type { ProviderModel } from '@/types/provider';
import { runtimeFetch } from './runtime-fetch';

const MODELS_API_URL = 'https://models.dev/api.json';
const CACHE_KEY = 'llm-tester-models-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_SYNCED_AT = 0;

interface ApiModel {
  id: string;
  name: string;
  status?: string;
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

function supportsStreaming(providerKey: string, modelId: string): boolean {
  if (providerKey === 'openai' && modelId.startsWith('gpt-5.5-pro')) {
    return false;
  }
  return true;
}

function toProviderModel(
  providerKey: string,
  id: string,
  model: ApiModel,
): ProviderModel {
  const tokenLimits = getTokenLimits(model);

  return {
    id,
    name: id,
    displayName: model.name || id,
    supportsStreaming: supportsStreaming(providerKey, id),
    source: 'models.dev',
    lastSyncedAt: DEFAULT_SYNCED_AT,
    maxTokens: tokenLimits?.output,
    capabilities: getModelCapabilities(model),
  };
}

function toModelModality(value: string): ModelModality | null {
  return value === 'text' ||
    value === 'image' ||
    value === 'pdf' ||
    value === 'audio' ||
    value === 'video'
    ? value
    : null;
}

function getModalities(values: string[] | undefined): ModelModality[] {
  return (values ?? [])
    .map(toModelModality)
    .filter((value): value is ModelModality => value !== null);
}

function getTokenLimits(
  model: ApiModel,
): ModelCapabilityOverrides['tokenLimits'] {
  if (model.limit?.context === undefined && model.limit?.output === undefined) {
    return undefined;
  }

  return {
    context: model.limit.context,
    output: model.limit.output,
  };
}

function getModelCapabilities(
  model: ApiModel,
): ModelCapabilityOverrides | undefined {
  const inputModalities = getModalities(model.modalities?.input);
  const outputModalities = getModalities(model.modalities?.output);
  const tokenLimits = getTokenLimits(model);
  const capabilities: ModelCapabilityOverrides = {};

  if (inputModalities.length > 0)
    capabilities.inputModalities = inputModalities;
  if (outputModalities.length > 0)
    capabilities.outputModalities = outputModalities;
  if (tokenLimits) capabilities.tokenLimits = tokenLimits;

  return Object.keys(capabilities).length > 0 ? capabilities : undefined;
}

function isTextChatModel(model: ApiModel): boolean {
  if (model.status === 'deprecated') return false;
  const output = model.modalities?.output ?? [];
  return output.includes('text') && !model.id.startsWith('text-embedding');
}

function isGeminiTextGenerationModel(id: string, model: ApiModel): boolean {
  return isTextChatModel(model) && !id.includes('embedding');
}

export interface FetchedModels {
  openai: ProviderModel[];
  anthropic: ProviderModel[];
  google: ProviderModel[];
  openrouter: ProviderModel[];
}

function normalizeFetchedModels(data: Partial<FetchedModels>): FetchedModels {
  return {
    openai: data.openai ?? [],
    anthropic: data.anthropic ?? [],
    google: data.google ?? [],
    openrouter: data.openrouter ?? OPENROUTER_HARDCODED_MODELS,
  };
}

function collectModels(
  models: Record<string, ApiModel>,
  filter: (id: string, model: ApiModel) => boolean,
): [string, ApiModel][] {
  return Object.entries(models).filter(([id, model]) => filter(id, model));
}

function sortByReleaseDate(
  providerKey: string,
  models: [string, ApiModel][],
): ProviderModel[] {
  return models
    .sort(([, a], [, b]) =>
      (b.release_date ?? '').localeCompare(a.release_date ?? ''),
    )
    .map(([id, model]) => toProviderModel(providerKey, id, model));
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

const OPENROUTER_HARDCODED_MODELS: ProviderModel[] = [
  {
    id: 'openrouter/auto',
    name: 'openrouter/auto',
    displayName: 'Auto (best available)',
    supportsStreaming: true,
    source: 'builtin-override',
  },
  {
    id: 'openrouter/free',
    name: 'openrouter/free',
    displayName: 'Free (best free)',
    supportsStreaming: true,
    source: 'builtin-override',
  },
];

function parseModelsResponse(data: ModelsApiResponse): FetchedModels {
  return {
    openai: data.openai?.models
      ? sortByReleaseDate(
          'openai',
          collectModels(data.openai.models, (_id, m) => isTextChatModel(m)),
        )
      : [],
    anthropic: data.anthropic?.models
      ? sortByReleaseDate(
          'anthropic',
          collectModels(data.anthropic.models, (_id, m) => isTextChatModel(m)),
        )
      : [],
    google: data.google?.models
      ? sortByReleaseDate(
          'google',
          collectModels(data.google.models, (id, m) =>
            isGeminiTextGenerationModel(id, m),
          ),
        )
      : [],
    openrouter: data.openrouter?.models
      ? [
          ...OPENROUTER_HARDCODED_MODELS,
          ...sortByReleaseDate(
            'openrouter',
            collectModels(
              data.openrouter.models,
              (id, m) => id.startsWith('openai/') && isTextChatModel(m),
            ),
          ),
          ...sortByReleaseDate(
            'openrouter',
            collectModels(
              data.openrouter.models,
              (id, m) => id.startsWith('anthropic/') && isTextChatModel(m),
            ),
          ),
        ]
      : OPENROUTER_HARDCODED_MODELS,
  };
}

function ensureHardcodedModels(models: FetchedModels): FetchedModels {
  const normalized = normalizeFetchedModels(models);
  const ids = new Set(normalized.openrouter.map((m) => m.id));
  const missing = OPENROUTER_HARDCODED_MODELS.filter((m) => !ids.has(m.id));
  if (missing.length === 0) return normalized;
  return { ...normalized, openrouter: [...missing, ...normalized.openrouter] };
}

export function clearModelsCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

export async function fetchModelsFromApi(): Promise<FetchedModels> {
  const cached = readCache();
  if (cached) return ensureHardcodedModels(cached);

  const res = await runtimeFetch(MODELS_API_URL);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data: ModelsApiResponse = await res.json();
  const syncedAt = Date.now();
  const result = withSyncedAt(parseModelsResponse(data), syncedAt);
  writeCache(result);
  return result;
}

function withSyncedAt(models: FetchedModels, syncedAt: number): FetchedModels {
  return {
    openai: models.openai.map((model) =>
      model.source === 'models.dev'
        ? { ...model, lastSyncedAt: syncedAt }
        : model,
    ),
    anthropic: models.anthropic.map((model) =>
      model.source === 'models.dev'
        ? { ...model, lastSyncedAt: syncedAt }
        : model,
    ),
    google: models.google.map((model) =>
      model.source === 'models.dev'
        ? { ...model, lastSyncedAt: syncedAt }
        : model,
    ),
    openrouter: models.openrouter.map((model) =>
      model.source === 'models.dev'
        ? { ...model, lastSyncedAt: syncedAt }
        : model,
    ),
  };
}

function getProviderModelsKey(
  providerName: string,
): keyof FetchedModels | null {
  switch (providerName.toLowerCase()) {
    case 'openai':
      return 'openai';
    case 'anthropic':
      return 'anthropic';
    case 'openrouter':
      return 'openrouter';
    case 'google gemini':
    case 'google':
      return 'google';
    default:
      return null;
  }
}

export async function fetchModelsForProvider(
  providerName: string,
): Promise<ProviderModel[]> {
  const models = await fetchModelsFromApi();
  const key = getProviderModelsKey(providerName);
  return key ? models[key] : [];
}
