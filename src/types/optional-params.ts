/** Sampling / output params that are optional in modern model APIs. */
export type OptionalParamKey =
  | 'temperature'
  | 'maxTokens'
  | 'topP'
  | 'topK'
  | 'frequencyPenalty'
  | 'presencePenalty';

export type ParamEnabledState = Record<OptionalParamKey, boolean>;

/** New composers omit optional params unless the user opts in. */
export const DEFAULT_PARAM_ENABLED: ParamEnabledState = {
  temperature: false,
  maxTokens: false,
  topP: false,
  topK: false,
  frequencyPenalty: false,
  presencePenalty: false,
};

/**
 * Legacy snapshots always sent these fields (except topK, which used 0 = omit).
 * Used when restoring saved requests / sessions that predate enable flags.
 */
export const LEGACY_PARAM_ENABLED: ParamEnabledState = {
  temperature: true,
  maxTokens: true,
  topP: true,
  topK: false,
  frequencyPenalty: true,
  presencePenalty: true,
};

export function createDefaultParamEnabled(): ParamEnabledState {
  return { ...DEFAULT_PARAM_ENABLED };
}

export function resolveParamEnabled(
  value: Partial<ParamEnabledState> | undefined,
  fallback: ParamEnabledState = LEGACY_PARAM_ENABLED,
): ParamEnabledState {
  return {
    temperature: value?.temperature ?? fallback.temperature,
    maxTokens: value?.maxTokens ?? fallback.maxTokens,
    topP: value?.topP ?? fallback.topP,
    topK: value?.topK ?? fallback.topK,
    frequencyPenalty: value?.frequencyPenalty ?? fallback.frequencyPenalty,
    presencePenalty: value?.presencePenalty ?? fallback.presencePenalty,
  };
}

/** Derive enable flags from which optional fields were present on a request. */
export function paramEnabledFromRequest(request: {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}): ParamEnabledState {
  return {
    temperature: request.temperature !== undefined,
    maxTokens: request.maxTokens !== undefined,
    topP: request.topP !== undefined,
    topK: request.topK !== undefined && request.topK > 0,
    frequencyPenalty: request.frequencyPenalty !== undefined,
    presencePenalty: request.presencePenalty !== undefined,
  };
}
