import { EventSourceParserStream } from 'eventsource-parser/stream';
import type { ProviderConfig } from '@/types/provider';
import type {
  NormalizedRequest,
  NormalizedResponse,
  NormalizedStreamChunk,
} from '@/types/normalized';
import { getAdapter } from '@/adapters';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/constants/defaults';
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
  const adapter = getAdapter(provider);

  const rawUrl = adapter.buildRequestUrl(provider, request);
  const url = getRequestUrl(rawUrl);

  if (import.meta.env.DEV) {
    console.log('[LLM Request]', rawUrl);
  }

  // Merge provider-level headers with request-level headers
  // Request-level headers take precedence over provider-level headers
  const mergedHeaders = {
    ...provider.customHeaders,
    ...customHeaders,
  };

  const headers = adapter.buildRequestHeaders(provider, mergedHeaders);
  const body = adapter.buildRequestBody(request, provider);

  const startTime = performance.now();

  const combinedSignal = signal
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

  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text();
    let errorJson: Record<string, unknown> | null = null;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // not JSON
    }
    const durationMs = Math.round(performance.now() - startTime);
    throw new RequestError(
      `HTTP ${fetchResponse.status}: ${errorJson ? JSON.stringify(errorJson) : errorText}`,
      fetchResponse.status,
      errorJson || { error: errorText },
      body,
      headers,
      responseHeaders,
      durationMs,
    );
  }

  if (request.stream && fetchResponse.body) {
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
    );
  }

  const rawResponse = await fetchResponse.json();
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

async function handleStream(
  body: ReadableStream<Uint8Array>,
  adapter: ReturnType<typeof getAdapter>,
  rawRequest: Record<string, unknown>,
  requestHeaders: Record<string, string>,
  responseHeaders: Record<string, string>,
  requestUrl: string,
  startTime: number,
  statusCode: number,
  onStreamChunk?: (chunk: NormalizedStreamChunk) => void,
): Promise<SendRequestResult> {
  const textStream = new TextDecoderStream();
  body.pipeTo(textStream.writable as WritableStream<Uint8Array>);
  const stream = textStream.readable.pipeThrough(new EventSourceParserStream());

  const reader = stream.getReader();
  let fullContent = '';
  let lastId = '';
  let lastModel = '';
  let finishReason: string | null = null;
  let usage: NormalizedResponse['usage'] = null;
  const allChunks: unknown[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const data = value.data;
    if (!data || data === '[DONE]') continue;

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(data);
    } catch {
      // skip unparseable
    }
    if (parsed) allChunks.push(parsed);

    const chunk = adapter.parseStreamChunk(data);
    if (chunk) {
      fullContent += chunk.content;
      if (chunk.id) lastId = chunk.id;
      if (chunk.model) lastModel = chunk.model;
      if (chunk.finishReason) finishReason = chunk.finishReason;
      if (chunk.usage) usage = chunk.usage;
      onStreamChunk?.(chunk);
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  const response: NormalizedResponse = {
    id: lastId,
    model: lastModel,
    content: fullContent,
    role: 'assistant',
    finishReason,
    usage,
  };

  const rawResponse = {
    chunks: allChunks,
    reconstructed: { id: lastId, model: lastModel, content: fullContent },
  };

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
  durationMs: number;

  constructor(
    message: string,
    status: number,
    rawResponse: Record<string, unknown>,
    rawRequest: Record<string, unknown>,
    requestHeaders: Record<string, string>,
    responseHeaders: Record<string, string>,
    durationMs: number,
  ) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.rawResponse = rawResponse;
    this.rawRequest = rawRequest;
    this.requestHeaders = requestHeaders;
    this.responseHeaders = responseHeaders;
    this.durationMs = durationMs;
  }
}
