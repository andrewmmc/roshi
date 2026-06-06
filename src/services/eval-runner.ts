import type { ProviderConfig } from '@/types/provider';
import type {
  NormalizedRequest,
  NormalizedResponse,
  NormalizedStreamChunk,
} from '@/types/normalized';
import type {
  EvalMetrics,
  EvalRunResult,
  EvalRunner,
  EvalSharedRequest,
} from '@/types/eval';
import { emptyResult, buildNormalizedRequestForRunner } from '@/types/eval';
import { resolveModelCapabilities } from '@/models/resolver';
import { estimateCostUsd } from '@/utils/cost';
import { sendRequest, RequestError } from './llm-client';

export interface EvalRunnerUpdate {
  runnerId: string;
  result: EvalRunResult;
}

export interface RunEvalOptions {
  runners: EvalRunner[];
  providers: ProviderConfig[];
  request: EvalSharedRequest;
  onUpdate: (update: EvalRunnerUpdate) => void;
  /** Optional per-runner controller registry so callers can cancel individually */
  registerController?: (runnerId: string, controller: AbortController) => void;
}

export interface RunEvalHandle {
  promise: Promise<EvalRunResult[]>;
  cancel: () => void;
}

export function runEval(options: RunEvalOptions): RunEvalHandle {
  const controllers = new Map<string, AbortController>();

  for (const runner of options.runners) {
    const controller = new AbortController();
    controllers.set(runner.id, controller);
    options.registerController?.(runner.id, controller);
  }

  const promise = Promise.allSettled(
    options.runners.map((runner) =>
      runSingleRunner({
        runner,
        providers: options.providers,
        request: options.request,
        onUpdate: options.onUpdate,
        signal: controllers.get(runner.id)!.signal,
      }),
    ),
  ).then((results) =>
    results.map((settled, index) =>
      settled.status === 'fulfilled'
        ? settled.value
        : buildCatastrophicResult(options.runners[index], settled.reason),
    ),
  );

  return {
    promise,
    cancel: () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
    },
  };
}

interface RunSingleRunnerArgs {
  runner: EvalRunner;
  providers: ProviderConfig[];
  request: EvalSharedRequest;
  onUpdate: (update: EvalRunnerUpdate) => void;
  signal: AbortSignal;
}

async function runSingleRunner(
  args: RunSingleRunnerArgs,
): Promise<EvalRunResult> {
  const { runner, providers, request, onUpdate, signal } = args;
  const provider = providers.find((p) => p.id === runner.providerId);

  if (!provider) {
    const result: EvalRunResult = {
      ...emptyResult(runner.id),
      status: 'error',
      error: `Provider not found (id=${runner.providerId}). It may have been deleted.`,
    };
    onUpdate({ runnerId: runner.id, result });
    return result;
  }

  const model = provider.models.find((m) => m.id === runner.modelId);
  const capabilities = resolveModelCapabilities(provider, runner.modelId);
  const canStream = capabilities.streaming && request.stream;

  const normalizedRequest: NormalizedRequest = buildNormalizedRequestForRunner(
    request,
    runner.modelId,
    { stream: canStream },
  );

  const startedAt = performance.now();
  let ttftMs: number | null = null;
  let streamedContent = '';

  const inProgressResult: EvalRunResult = {
    ...emptyResult(runner.id),
    status: canStream ? 'streaming' : 'pending',
  };
  onUpdate({ runnerId: runner.id, result: cloneResult(inProgressResult) });

  const customHeaders = request.customHeaders.reduce<Record<string, string>>(
    (acc, header) => {
      if (header.key.trim()) acc[header.key] = header.value;
      return acc;
    },
    {},
  );

  try {
    const sendResult = await sendRequest({
      provider,
      request: normalizedRequest,
      customHeaders:
        Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
      signal,
      onStreamChunk: (chunk: NormalizedStreamChunk) => {
        if (ttftMs === null && chunk.content) {
          ttftMs = Math.max(0, Math.round(performance.now() - startedAt));
        }
        streamedContent += chunk.content;
        const partialMetrics: EvalMetrics = {
          ...inProgressResult.metrics,
          ttftMs: ttftMs,
        };
        const update: EvalRunResult = {
          ...inProgressResult,
          status: 'streaming',
          content: streamedContent,
          metrics: partialMetrics,
        };
        inProgressResult.content = streamedContent;
        inProgressResult.metrics = partialMetrics;
        inProgressResult.status = 'streaming';
        onUpdate({ runnerId: runner.id, result: cloneResult(update) });
      },
    });

    const metrics = buildMetrics({
      response: sendResult.response,
      durationMs: sendResult.durationMs,
      statusCode: sendResult.statusCode,
      ttftMs,
      pricing: model?.pricing,
    });

    const result: EvalRunResult = {
      runnerId: runner.id,
      status: 'success',
      content: sendResult.response.content,
      error: null,
      metrics,
      rating: null,
      thumbs: null,
    };
    onUpdate({ runnerId: runner.id, result: cloneResult(result) });
    return result;
  } catch (err) {
    return handleRunnerError({
      runner,
      err,
      model,
      ttftMs,
      streamedContent,
      onUpdate,
    });
  }
}

interface HandleRunnerErrorArgs {
  runner: EvalRunner;
  err: unknown;
  model: ProviderConfig['models'][number] | undefined;
  ttftMs: number | null;
  streamedContent: string;
  onUpdate: (update: EvalRunnerUpdate) => void;
}

function handleRunnerError(args: HandleRunnerErrorArgs): EvalRunResult {
  const { runner, err, model, ttftMs, streamedContent, onUpdate } = args;

  if (err instanceof DOMException && err.name === 'AbortError') {
    const result: EvalRunResult = {
      ...emptyResult(runner.id),
      status: 'cancelled',
      content: streamedContent,
      error: 'Cancelled',
      metrics: { ...emptyResult(runner.id).metrics, ttftMs },
    };
    onUpdate({ runnerId: runner.id, result: cloneResult(result) });
    return result;
  }

  if (err instanceof RequestError) {
    const result: EvalRunResult = {
      ...emptyResult(runner.id),
      status: 'error',
      content: streamedContent,
      error: err.message,
      metrics: buildMetrics({
        response: null,
        durationMs: err.durationMs,
        statusCode: err.status,
        ttftMs,
        pricing: model?.pricing,
      }),
    };
    onUpdate({ runnerId: runner.id, result: cloneResult(result) });
    return result;
  }

  const message =
    err instanceof Error ? err.message : `Unknown error: ${String(err)}`;
  const result: EvalRunResult = {
    ...emptyResult(runner.id),
    status: 'error',
    content: streamedContent,
    error: message,
    metrics: { ...emptyResult(runner.id).metrics, ttftMs },
  };
  onUpdate({ runnerId: runner.id, result: cloneResult(result) });
  return result;
}

interface BuildMetricsArgs {
  response: NormalizedResponse | null;
  durationMs: number | null;
  statusCode: number | null;
  ttftMs: number | null;
  pricing: ProviderConfig['models'][number]['pricing'];
}

function buildMetrics(args: BuildMetricsArgs): EvalMetrics {
  const { response, durationMs, statusCode, ttftMs, pricing } = args;
  const promptTokens = response?.usage?.promptTokens ?? null;
  const completionTokens = response?.usage?.completionTokens ?? null;
  const totalTokens = response?.usage?.totalTokens ?? null;
  const responseChars =
    response?.content !== undefined ? response.content.length : null;

  const tokensPerSec = computeTokensPerSec({
    completionTokens,
    durationMs,
    ttftMs,
  });

  return {
    durationMs,
    ttftMs,
    tokensPerSec,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd: estimateCostUsd({
      pricing: pricing ?? null,
      promptTokens,
      completionTokens,
    }),
    responseChars,
    finishReason: response?.finishReason ?? null,
    statusCode,
  };
}

function computeTokensPerSec(args: {
  completionTokens: number | null;
  durationMs: number | null;
  ttftMs: number | null;
}): number | null {
  const { completionTokens, durationMs, ttftMs } = args;
  if (typeof completionTokens !== 'number' || completionTokens <= 0) {
    return null;
  }
  if (typeof durationMs !== 'number' || durationMs <= 0) {
    return null;
  }
  const generationMs =
    typeof ttftMs === 'number' && ttftMs > 0 && ttftMs < durationMs
      ? durationMs - ttftMs
      : durationMs;
  if (generationMs <= 0) return null;
  return completionTokens / (generationMs / 1000);
}

function buildCatastrophicResult(
  runner: EvalRunner,
  reason: unknown,
): EvalRunResult {
  const message =
    reason instanceof Error
      ? reason.message
      : `Unknown error: ${String(reason)}`;
  return {
    ...emptyResult(runner.id),
    status: 'error',
    error: message,
  };
}

function cloneResult(result: EvalRunResult): EvalRunResult {
  return { ...result, metrics: { ...result.metrics } };
}
