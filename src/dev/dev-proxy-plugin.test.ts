import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ViteDevServer } from 'vite';
import { devProxyPlugin } from './dev-proxy-plugin';

class MockResponse extends EventEmitter {
  statusCode = 200;
  headersSent = false;
  destroyed = false;
  readonly headers = new Map<string, string>();
  readonly chunks: Buffer[] = [];

  setHeader(name: string, value: string): void {
    this.headers.set(name, value);
  }

  write(chunk: Uint8Array | string): void {
    this.headersSent = true;
    this.chunks.push(Buffer.from(chunk));
  }

  end(chunk?: Uint8Array | string): void {
    if (chunk) this.write(chunk);
  }

  destroy(): void {
    this.destroyed = true;
  }
}

function getProxyHandler(options: Parameters<typeof devProxyPlugin>[0] = {}) {
  let handler:
    | ((request: Readable, response: MockResponse) => Promise<void>)
    | undefined;
  devProxyPlugin(options).configureServer({
    middlewares: {
      use: (
        _path: string,
        middleware: (
          request: Readable,
          response: MockResponse,
        ) => Promise<void>,
      ) => {
        handler = middleware;
      },
    },
  } as unknown as ViteDevServer);
  if (!handler) throw new Error('Proxy middleware was not registered');
  return handler;
}

function createRequest(): Readable {
  return Object.assign(Readable.from([Buffer.from('{}')]), {
    method: 'POST',
    headers: {},
    url: '/?url=https%3A%2F%2Fexample.com%2Fv1%2Fchat',
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('devProxyPlugin', () => {
  it('rejects an oversized response before forwarding headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('too large', {
          headers: { 'content-length': '4' },
        }),
      ),
    );
    const response = new MockResponse();

    await getProxyHandler({ maxResponseBytes: 3 })(createRequest(), response);

    expect(response.statusCode).toBe(413);
    expect(response.destroyed).toBe(false);
    expect(Buffer.concat(response.chunks).toString()).toContain(
      'Response exceeds 3 byte limit',
    );
  });

  it('terminates an already-started oversized response without appending JSON', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(body, {
          headers: { 'content-type': 'text/event-stream' },
        }),
      ),
    );
    const response = new MockResponse();

    await getProxyHandler({ maxResponseBytes: 3 })(createRequest(), response);

    expect(response.destroyed).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(Buffer.concat(response.chunks)).toEqual(Buffer.from([1, 2]));
  });

  it('uses an idle timeout for active SSE streams', async () => {
    vi.useFakeTimers();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({
      start(streamController) {
        controller = streamController;
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        init.signal?.addEventListener('abort', () =>
          controller?.error(new DOMException('Timed out', 'AbortError')),
        );
        return Promise.resolve(
          new Response(body, {
            headers: { 'content-type': 'text/event-stream' },
          }),
        );
      }),
    );
    const response = new MockResponse();
    const proxyPromise = getProxyHandler({
      requestTimeoutMs: 100,
      streamIdleTimeoutMs: 100,
    })(createRequest(), response);

    await vi.advanceTimersByTimeAsync(0);
    controller?.enqueue(new Uint8Array([1]));
    await vi.advanceTimersByTimeAsync(99);
    controller?.enqueue(new Uint8Array([2]));
    await vi.advanceTimersByTimeAsync(99);

    expect(response.destroyed).toBe(false);

    await vi.advanceTimersByTimeAsync(2);
    await proxyPromise;

    expect(response.destroyed).toBe(true);
  });
});
