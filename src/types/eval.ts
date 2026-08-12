import type { NormalizedMessage, NormalizedRequest } from '@/types/normalized';
import {
  LEGACY_PARAM_ENABLED,
  resolveParamEnabled,
  type ParamEnabledState,
} from '@/types/optional-params';
import type { HistoryHeaderEntry } from '@/utils/headers';

export type EvalRunStatus =
  'pending' | 'streaming' | 'success' | 'partial' | 'error' | 'cancelled';

export interface EvalRunner {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  /** Display label, e.g. "OpenAI / gpt-5" */
  label: string;
}

export interface EvalMetrics {
  durationMs: number | null;
  /** Time to first token, in ms. null when not streaming or not measurable. */
  ttftMs: number | null;
  tokensPerSec: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  responseChars: number | null;
  finishReason: string | null;
  statusCode: number | null;
}

export interface JudgeCriterionScore {
  helpfulness: number;
  accuracy: number;
  clarity: number;
  overall: number;
  rationale: string;
}

export interface JudgeResult {
  scores: Record<string, JudgeCriterionScore>;
  winnerRunnerId: string | null;
  rawContent: string;
  error: string | null;
}

export interface EvalRunResult {
  runnerId: string;
  status: EvalRunStatus;
  content: string;
  error: string | null;
  metrics: EvalMetrics;
  rating: number | null;
  /** Optional thumbs up/down independent of the 1-5 rating */
  thumbs: 'up' | 'down' | null;
}

export interface EvalSharedRequest {
  messages: NormalizedMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  /** Absent on legacy eval runs — treat as all enabled (except topK). */
  paramEnabled?: ParamEnabledState;
  stream: boolean;
  customHeaders: HistoryHeaderEntry[];
}

export interface JudgeRunnerSelection {
  providerId: string;
  modelId: string;
}

export interface JudgeConfig {
  enabled: boolean;
  runner: JudgeRunnerSelection | null;
  rubric: string;
}

export interface EvalCollection {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
}

export interface EvalRunRecord {
  id: string;
  createdAt: Date;
  name?: string;
  /** Folder this run belongs to. Undefined = ungrouped. */
  collectionId?: string;
  request: EvalSharedRequest;
  runners: EvalRunner[];
  results: EvalRunResult[];
  judgeConfig: JudgeConfig;
  judgeResult: JudgeResult | null;
}

export function emptyMetrics(): EvalMetrics {
  return {
    durationMs: null,
    ttftMs: null,
    tokensPerSec: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    costUsd: null,
    responseChars: null,
    finishReason: null,
    statusCode: null,
  };
}

export function emptyResult(runnerId: string): EvalRunResult {
  return {
    runnerId,
    status: 'pending',
    content: '',
    error: null,
    metrics: emptyMetrics(),
    rating: null,
    thumbs: null,
  };
}

export function buildNormalizedRequestForRunner(
  shared: EvalSharedRequest,
  modelId: string,
  overrides: Partial<Pick<NormalizedRequest, 'stream'>> = {},
): NormalizedRequest {
  const enabled = resolveParamEnabled(shared.paramEnabled, {
    ...LEGACY_PARAM_ENABLED,
    // Pre-flag eval runs sent topK whenever it was non-zero.
    topK: shared.topK > 0,
  });
  return {
    messages: shared.messages,
    model: modelId,
    temperature: enabled.temperature ? shared.temperature : undefined,
    maxTokens: enabled.maxTokens ? shared.maxTokens : undefined,
    topP: enabled.topP ? shared.topP : undefined,
    topK: enabled.topK && shared.topK > 0 ? shared.topK : undefined,
    frequencyPenalty: enabled.frequencyPenalty
      ? shared.frequencyPenalty
      : undefined,
    presencePenalty: enabled.presencePenalty
      ? shared.presencePenalty
      : undefined,
    stream: overrides.stream ?? shared.stream,
    systemPrompt: shared.systemPrompt || undefined,
    thinking: undefined,
    effort: undefined,
    verbosity: undefined,
  };
}
