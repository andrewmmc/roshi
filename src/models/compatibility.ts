import type { NormalizedRequest } from '@/types/normalized';
import type { ModelCapabilities, ParamSupport } from './capabilities';

type FilterableRequestParam =
  | 'temperature'
  | 'topP'
  | 'topK'
  | 'frequencyPenalty'
  | 'presencePenalty';

export interface OmittedRequestParam {
  param: keyof NormalizedRequest;
  reason: string;
}

export interface RequestCompatibilityResult {
  request: NormalizedRequest;
  omittedParams: OmittedRequestParam[];
  warnings: string[];
  blockingErrors: string[];
}

function getUnsupportedReason(support: ParamSupport | undefined): string {
  if (!support) return 'This parameter is not supported by this model.';
  if (support.supported === false) {
    return support.reason ?? 'This parameter is not supported by this model.';
  }
  if (support.supported === 'default-only') {
    return (
      support.reason ??
      `This model only supports the default value (${support.default}).`
    );
  }
  return '';
}

function applyParamSupport(
  request: NormalizedRequest,
  omittedParams: OmittedRequestParam[],
  param: FilterableRequestParam,
  support: ParamSupport | undefined,
): void {
  if (request[param] === undefined || support?.supported === true) return;

  omittedParams.push({ param, reason: getUnsupportedReason(support) });
  request[param] = undefined;
}

export function filterRequestByCapabilities(
  request: NormalizedRequest,
  capabilities: ModelCapabilities,
): RequestCompatibilityResult {
  const compatibleRequest: NormalizedRequest = { ...request };
  const omittedParams: OmittedRequestParam[] = [];

  if (compatibleRequest.stream && !capabilities.streaming) {
    omittedParams.push({
      param: 'stream',
      reason: 'Streaming is not supported by this model.',
    });
    compatibleRequest.stream = false;
  }

  applyParamSupport(
    compatibleRequest,
    omittedParams,
    'temperature',
    capabilities.params.temperature,
  );
  applyParamSupport(
    compatibleRequest,
    omittedParams,
    'topP',
    capabilities.params.topP,
  );
  applyParamSupport(
    compatibleRequest,
    omittedParams,
    'topK',
    capabilities.params.topK,
  );
  applyParamSupport(
    compatibleRequest,
    omittedParams,
    'frequencyPenalty',
    capabilities.params.frequencyPenalty,
  );
  applyParamSupport(
    compatibleRequest,
    omittedParams,
    'presencePenalty',
    capabilities.params.presencePenalty,
  );

  if (
    compatibleRequest.maxTokens !== undefined &&
    capabilities.params.maxTokens?.supported !== true
  ) {
    omittedParams.push({
      param: 'maxTokens',
      reason: 'Max tokens is not supported by this model.',
    });
    compatibleRequest.maxTokens = undefined;
  }

  if (
    compatibleRequest.thinking !== undefined &&
    !capabilities.params.thinking
  ) {
    omittedParams.push({
      param: 'thinking',
      reason: 'Thinking controls are not supported by this model.',
    });
    compatibleRequest.thinking = undefined;
  }

  return {
    request: compatibleRequest,
    omittedParams,
    warnings: [],
    blockingErrors: [],
  };
}
