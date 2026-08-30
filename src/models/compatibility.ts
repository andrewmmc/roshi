import type { NormalizedRequest } from '@/types/normalized';
import type { MessageKey } from '@/i18n/types';
import { translateNow } from '@/i18n';
import type { ModelCapabilities, ParamSupport } from './capabilities';

type FilterableRequestParam =
  'temperature' | 'topP' | 'topK' | 'frequencyPenalty' | 'presencePenalty';

const PARAM_LABELS: Partial<Record<keyof NormalizedRequest, MessageKey>> = {
  stream: 'request.paramLabelStream',
  temperature: 'request.temperature',
  topP: 'request.topP',
  topK: 'request.topK',
  frequencyPenalty: 'request.frequencyPenalty',
  presencePenalty: 'request.presencePenalty',
  maxTokens: 'request.maxTokens',
  thinking: 'request.thinking',
  effort: 'request.effort',
  reasoningMode: 'request.reasoningMode',
  verbosity: 'request.verbosity',
};

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
  if (!support) return translateNow('request.paramUnsupportedGeneric');
  if (support.supported === false) {
    return support.reason ?? translateNow('request.paramUnsupportedGeneric');
  }
  if (support.supported === 'default-only') {
    return (
      support.reason ??
      translateNow('request.paramDefaultOnly', {
        default: String(support.default),
      })
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

function getWarnings(omittedParams: OmittedRequestParam[]): string[] {
  return omittedParams.map(({ param, reason }) => {
    const labelKey = PARAM_LABELS[param];
    const label = labelKey ? translateNow(labelKey) : param;
    return translateNow('request.paramOmittedWarning', { label, reason });
  });
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
      reason: translateNow('request.streamUnsupportedModel'),
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
      reason: translateNow('request.maxTokensUnsupportedModel'),
    });
    compatibleRequest.maxTokens = undefined;
  }

  if (
    compatibleRequest.thinking !== undefined &&
    !capabilities.params.thinking
  ) {
    omittedParams.push({
      param: 'thinking',
      reason: translateNow('request.thinkingUnsupportedModel'),
    });
    compatibleRequest.thinking = undefined;
  }

  if (
    compatibleRequest.effort !== undefined &&
    (!capabilities.params.effort ||
      !capabilities.params.effort.levels.includes(compatibleRequest.effort))
  ) {
    omittedParams.push({
      param: 'effort',
      reason: translateNow('request.effortUnsupported'),
    });
    compatibleRequest.effort = undefined;
  }

  if (
    compatibleRequest.reasoningMode !== undefined &&
    (!capabilities.params.reasoningMode ||
      !capabilities.params.reasoningMode.levels.includes(
        compatibleRequest.reasoningMode,
      ))
  ) {
    omittedParams.push({
      param: 'reasoningMode',
      reason: translateNow('request.reasoningModeUnsupported'),
    });
    compatibleRequest.reasoningMode = undefined;
  }

  if (
    compatibleRequest.verbosity !== undefined &&
    (!capabilities.params.verbosity ||
      !capabilities.params.verbosity.levels.includes(
        compatibleRequest.verbosity,
      ))
  ) {
    omittedParams.push({
      param: 'verbosity',
      reason: translateNow('request.verbosityUnsupported'),
    });
    compatibleRequest.verbosity = undefined;
  }

  return {
    request: compatibleRequest,
    omittedParams,
    warnings: getWarnings(omittedParams),
    blockingErrors: [],
  };
}
