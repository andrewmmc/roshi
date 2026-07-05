import { EventSourceParserStream } from 'eventsource-parser/stream';
import type { ProviderConfig } from '@/types/provider';
import type {
  NormalizedRequest,
  NormalizedResponse,
  NormalizedStreamChunk,
} from '@/types/normalized';
import { getAdapter } from '@/adapters';
import type { ProviderAdapter } from '@/adapters/types';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
} from '@/constants/defaults';
import { filterRequestByCapabilities } from '@/models/compatibility';
import { resolveModelCapabilities } from '@/models/resolver';
import { mergeUsage } from '@/adapters/shared';
import { runtimeFetch } from './runtime-fetch';

export interface SendRequestOptions {
  provider: ProviderConfig;
  request: NormalizedRequest;
  customHeaders?: Record<string, string>;
  onStreamChunk?: (chunk: NormalizedStreamChunk) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface SendRequestResult {
  response: NormalizedResponse;
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
  requestUrl: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  durationMs: number;
  statusCode: number;
}

export async function sendRequest(
  options: SendRequestOptions,
): Promise<SendRequestResult> {
  const {
    provider,
    request,
    customHeaders,
    onStreamChunk,
    signal,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  } = options;
  const capabilities = resolveModelCapabilities(provider, request.model);
  const compatibleRequest = filterRequestByCapabilities(
    request,
    capabilities,
  ).request;
  const adapter = getAdapter(provider, compatibleRequest.model);

  const rawUrl = adapter.buildRequestUrl(provider, compatibleRequest);
  const url = getRequestUrl(rawUrl);

  if (import.meta.env.DEV) {
    console.log('[LLM Request]', getLogSafeRequestUrl(provider, rawUrl));
  }

  // Merge provider-level headers with request-level headers
  // Request-level headers take precedence over provider-level headers
  const mergedHeaders = {
    ...provider.customHeaders,
    ...customHeaders,
  };

  const headers = adapter.buildRequestHeaders(provider, mergedHeaders);
  const body = adapter.buildRequestBody(compatibleRequest, provider);

  const startTime = performance.now();

  const isStreaming = compatibleRequest.stream;
  const combinedSignal = isStreaming
    ? signal
    : signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);

  const fetchResponse = await runtimeFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: combinedSignal,
  });

  const responseHeaders: Record<string, string> = {};
  fetchResponse.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const createRequestError = (
    message: string,
    rawResponse: Record<string, unknown>,
  ) => {
    const durationMs = Math.round(performance.now() - startTime);
    return new RequestError(
      message,
      fetchResponse.status,
      rawResponse,
      body,
      headers,
      responseHeaders,
      rawUrl,
      durationMs,
    );
  };

  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text();
    const errorJson = parseJsonObject(errorText);
    throw createRequestError(
      `HTTP ${fetchResponse.status}: ${errorJson ? JSON.stringify(errorJson) : errorText}`,
      errorJson || { error: errorText },
    );
  }

  if (compatibleRequest.stream && fetchResponse.body) {
    return handleStream(
      fetchResponse.body,
      adapter,
      body,
      headers,
      responseHeaders,
      rawUrl,
      startTime,
      fetchResponse.status,
      onStreamChunk,
      timeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS,
    );
  }

  const responseText = await fetchResponse.text();
  const rawResponse = parseJsonObject(responseText);
  if (!rawResponse) {
    throw createRequestError('Provider returned invalid JSON', {
      error: 'Provider returned invalid JSON',
      body: responseText,
    });
  }
  const durationMs = Math.round(performance.now() - startTime);
  const response = adapter.parseResponse(rawResponse);

  return {
    response,
    rawRequest: body,
    rawResponse,
    requestUrl: rawUrl,
    requestHeaders: headers,
    responseHeaders,
    durationMs,
    statusCode: fetchResponse.status,
  };
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getLogSafeRequestUrl(
  provider: ProviderConfig,
  requestUrl: string,
): string {
  if (provider.auth.type !== 'query-param' || !provider.apiKey) {
    return requestUrl;
  }

  return requestUrl
    .replaceAll(provider.apiKey, '[REDACTED]')
    .replaceAll(encodeURIComponent(provider.apiKey), '[REDACTED]');
}

function getRequestUrl(targetUrl: string): string {
  if (!import.meta.env.DEV) {
    return targetUrl;
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return targetUrl;
    }
  } catch {
    return targetUrl;
  }

  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

function buildStreamState(
  fullContent: string,
  lastId: string,
  lastModel: string,
  finishReason: string | null,
  usage: NormalizedResponse['usage'],
  allChunks: unknown[],
): { response: NormalizedResponse; rawResponse: Record<string, unknown> } {
  const response: NormalizedResponse = {
    id: lastId,
    model: lastModel,
    content: fullContent,
    role: 'assistant',
    finishReason,
    usage,
  };

  return {
    response,
    rawResponse: {
      chunks: allChunks,
      reconstructed: { id: lastId, model: lastModel, content: fullContent },
    },
  };
}

function throwStreamError(
  cause: unknown,
  statusCode: number,
  rawRequest: Record<string, unknown>,
  requestHeaders: Record<string, string>,
  responseHeaders: Record<string, string>,
  requestUrl: string,
  startTime: number,
  partialResponse: NormalizedResponse,
  rawResponse: Record<string, unknown>,
): never {
  const durationMs = Math.round(performance.now() - startTime);
  const message = cause instanceof Error ? cause.message : 'Stream interrupted';
  throw new StreamError(
    message,
    statusCode,
    {
      ...rawResponse,
      interrupted: true,
      streamError: message,
    },
    rawRequest,
    requestHeaders,
    responseHeaders,
    requestUrl,
    durationMs,
    partialResponse,
  );
}

async function handleStream(
  body: ReadableStream<Uint8Array>,
  adapter: ProviderAdapter,
  rawRequest: Record<string, unknown>,
  requestHeaders: Record<string, string>,
  responseHeaders: Record<string, string>,
  requestUrl: string,
  startTime: number,
  statusCode: number,
  onStreamChunk?: (chunk: NormalizedStreamChunk) => void,
  idleTimeoutMs = DEFAULT_STREAM_IDLE_TIMEOUT_MS,
): Promise<SendRequestResult> {
  const textStream = new TextDecoderStream();
  const pipePromise = body.pipeTo(
    textStream.writable as WritableStream<Uint8Array>,
  );
  const stream = textStream.readable.pipeThrough(new EventSourceParserStream());

  const reader = stream.getReader();
  let fullContent = '';
  let lastId = '';
  let lastModel = '';
  let finishReason: string | null = null;
  let usage: NormalizedResponse['usage'] = null;
  const allChunks: unknown[] = [];

  let pipeError: unknown;
  let readError: unknown;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const clearIdleTimer = () => {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  };

  const armIdleTimer = () => {
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      readError = new DOMException(
        'The stream stopped receiving data before completion. The provider may be overloaded or unreachable.',
        'TimeoutError',
      );
      void reader.cancel();
    }, idleTimeoutMs);
  };

  try {
    armIdleTimer();
    while (true) {
      let done: boolean;
      let value: { data?: string } | undefined;
      try {
        ({ done, value } = await reader.read());
      } catch (error) {
        readError = error;
        break;
      }
      if (done) break;

      armIdleTimer();

      const data = value?.data;
      if (!data || data === '[DONE]') continue;

      const parsed = parseJsonObject(data);
      if (parsed) allChunks.push(parsed);

      const streamErrorMessage = adapter.parseStreamError?.(data);
      if (streamErrorMessage) {
        readError = new Error(streamErrorMessage);
        break;
      }

      const chunk = adapter.parseStreamChunk(data);
      if (chunk) {
        fullContent += chunk.content;
        if (chunk.id) lastId = chunk.id;
        if (chunk.model) lastModel = chunk.model;
        if (chunk.finishReason) finishReason = chunk.finishReason;
        if (chunk.usage) usage = mergeUsage(usage, chunk.usage);
        onStreamChunk?.(chunk);
      }
    }
  } finally {
    clearIdleTimer();
    reader.releaseLock();
    await pipePromise.catch((error) => {
      pipeError = error;
    });
  }

  const { response, rawResponse } = buildStreamState(
    fullContent,
    lastId,
    lastModel,
    finishReason,
    usage,
    allChunks,
  );

  const streamFailure = readError ?? pipeError;
  if (streamFailure) {
    if (
      streamFailure instanceof DOMException &&
      streamFailure.name === 'AbortError'
    ) {
      throw streamFailure;
    }
    throwStreamError(
      streamFailure,
      statusCode,
      rawRequest,
      requestHeaders,
      responseHeaders,
      requestUrl,
      startTime,
      response,
      rawResponse,
    );
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    response,
    rawRequest,
    rawResponse,
    requestUrl,
    requestHeaders,
    responseHeaders,
    durationMs,
    statusCode,
  };
}

export class RequestError extends Error {
  status: number;
  rawResponse: Record<string, unknown>;
  rawRequest: Record<string, unknown>;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestUrl: string;
  durationMs: number;

  constructor(
    message: string,
    status: number,
    rawResponse: Record<string, unknown>,
    rawRequest: Record<string, unknown>,
    requestHeaders: Record<string, string>,
    responseHeaders: Record<string, string>,
    requestUrl: string,
    durationMs: number,
  ) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.rawResponse = rawResponse;
    this.rawRequest = rawRequest;
    this.requestHeaders = requestHeaders;
    this.responseHeaders = responseHeaders;
    this.requestUrl = requestUrl;
    this.durationMs = durationMs;
  }
}

export class StreamError extends RequestError {
  partialResponse: NormalizedResponse;

  constructor(
    message: string,
    status: number,
    rawResponse: Record<string, unknown>,
    rawRequest: Record<string, unknown>,
    requestHeaders: Record<string, string>,
    responseHeaders: Record<string, string>,
    requestUrl: string,
    durationMs: number,
    partialResponse: NormalizedResponse,
  ) {
    super(
      message,
      status,
      rawResponse,
      rawRequest,
      requestHeaders,
      responseHeaders,
      requestUrl,
      durationMs,
    );
    this.name = 'StreamError';
    this.partialResponse = partialResponse;
  }
}
