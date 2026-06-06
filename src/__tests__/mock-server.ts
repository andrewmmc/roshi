import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { URL } from 'node:url';

export interface CapturedRequest {
  method: string;
  pathname: string;
  search: string;
  headers: Record<string, string>;
  rawBody: string;
  body: unknown;
}

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  json?: Record<string, unknown>;
  text?: string;
  /** SSE event payloads (without the `data: ` prefix). */
  sse?: string[];
  delayMs?: number;
}

export type MockHandler = (
  req: CapturedRequest,
) => MockResponse | Promise<MockResponse>;

interface Route {
  method: string;
  match: (pathname: string) => boolean;
  handler: MockHandler;
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseJsonBody(rawBody: string): unknown {
  if (!rawBody.trim()) {
    return null;
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

function normalizeHeaders(
  headers: IncomingMessage['headers'],
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    normalized[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
  }
  return normalized;
}

function writeMockResponse(res: ServerResponse, response: MockResponse): void {
  const status = response.status ?? 200;
  const headers: Record<string, string> = {
    ...response.headers,
  };

  if (response.sse) {
    headers['content-type'] = headers['content-type'] ?? 'text/event-stream';
    res.writeHead(status, headers);
    for (const event of response.sse) {
      res.write(`data: ${event}\n\n`);
    }
    res.end();
    return;
  }

  const body =
    response.text ??
    (response.json !== undefined ? JSON.stringify(response.json) : '');

  if (body && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }

  res.writeHead(status, headers);
  res.end(body);
}

export class MockHttpServer {
  private server: Server | null = null;
  private baseUrl = '';
  private routes: Route[] = [];
  private fallbackHandler: MockHandler = () => ({
    status: 404,
    json: { error: 'No mock handler registered' },
  });

  readonly requests: CapturedRequest[] = [];

  on(method: string, path: string | RegExp, handler: MockHandler): this {
    const match =
      typeof path === 'string'
        ? (pathname: string) => pathname === path
        : (pathname: string) => path.test(pathname);

    this.routes.push({
      method: method.toUpperCase(),
      match,
      handler,
    });
    return this;
  }

  setFallback(handler: MockHandler): this {
    this.fallbackHandler = handler;
    return this;
  }

  resetRequests(): void {
    this.requests.length = 0;
  }

  get url(): string {
    return this.baseUrl;
  }

  async listen(): Promise<string> {
    if (this.server) {
      return this.baseUrl;
    }

    this.server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', this.baseUrl || 'http://127.0.0.1');
      const rawBody = await readRequestBody(req);
      const captured: CapturedRequest = {
        method: (req.method ?? 'GET').toUpperCase(),
        pathname: url.pathname,
        search: url.search,
        headers: normalizeHeaders(req.headers),
        rawBody,
        body: parseJsonBody(rawBody),
      };
      this.requests.push(captured);

      const route = this.routes.find(
        (candidate) =>
          candidate.method === captured.method && candidate.match(url.pathname),
      );
      const handler = route?.handler ?? this.fallbackHandler;

      try {
        const response = await handler(captured);
        if (response.delayMs) {
          await new Promise((resolve) => setTimeout(resolve, response.delayMs));
        }
        writeMockResponse(res, response);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Mock handler failed';
        writeMockResponse(res, {
          status: 500,
          json: { error: message },
        });
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => resolve());
    });

    const address = this.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to start mock HTTP server');
    }

    this.baseUrl = `http://127.0.0.1:${address.port}`;
    return this.baseUrl;
  }

  async close(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    this.server = null;
    this.baseUrl = '';
  }
}

export function createOpenAIStreamChunks(
  parts: string[],
  options?: { id?: string; model?: string },
): string[] {
  const id = options?.id ?? 'chatcmpl-stream';
  const model = options?.model ?? 'gpt-4';

  return parts.map((content, index) =>
    JSON.stringify({
      id,
      model,
      choices: [
        {
          index: 0,
          delta: { content },
          finish_reason: index === parts.length - 1 ? 'stop' : null,
        },
      ],
    }),
  );
}

export function createAnthropicStreamChunks(
  text: string,
  options?: { id?: string; model?: string },
): string[] {
  const id = options?.id ?? 'msg_stream';
  const model = options?.model ?? 'claude-sonnet-4-20250514';

  return [
    JSON.stringify({
      type: 'message_start',
      message: { id, model, usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    JSON.stringify({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text },
    }),
    JSON.stringify({
      type: 'message_delta',
      delta: { stop_reason: 'end_turn' },
      usage: { input_tokens: 5, output_tokens: 3 },
    }),
  ];
}
