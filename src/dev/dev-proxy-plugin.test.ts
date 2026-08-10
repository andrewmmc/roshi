import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ViteDevServer } from 'vite';
import { EnvHttpProxyAgent } from 'undici';
import { devProxyPlugin } from './dev-proxy-plugin';
import {
  DEV_HTTP_PROXY_HEADER,
  DEV_HTTPS_PROXY_HEADER,
  DEV_NO_PROXY_HEADER,
} from './proxy-headers';

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
  devProxyPlugin({
    resolveHostname: async () => ['93.184.216.34'],
    ...options,
  }).configureServer({
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

function createRequest(headers: Record<string, string> = {}): Readable {
  return Object.assign(Readable.from([Buffer.from('{}')]), {
    method: 'POST',
    headers,
    url: '/?url=https%3A%2F%2Fexample.com%2Fv1%2Fchat',
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('devProxyPlugin', () => {
  it('uses configured proxies without forwarding configuration headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = new MockResponse();

    await getProxyHandler()(
      createRequest({
        [DEV_HTTP_PROXY_HEADER]: 'http://proxy.test:8080',
        [DEV_HTTPS_PROXY_HEADER]: 'http://secure-proxy.test:8443',
        [DEV_NO_PROXY_HEADER]: 'localhost,.internal.test',
      }),
      response,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ dispatcher: expect.any(EnvHttpProxyAgent) }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.has(DEV_HTTP_PROXY_HEADER)).toBe(false);
    expect(headers.has(DEV_HTTPS_PROXY_HEADER)).toBe(false);
    expect(headers.has(DEV_NO_PROXY_HEADER)).toBe(false);
  });

  it('rejects targets that resolve to private network addresses', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = new MockResponse();

    await getProxyHandler({ resolveHostname: async () => ['127.0.0.1'] })(
      createRequest(),
      response,
    );

    expect(response.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects oversized request bodies before calling upstream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = new MockResponse();

    await getProxyHandler({ maxRequestBytes: 1 })(createRequest(), response);

    expect(response.statusCode).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

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
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ redirect: 'error' }),
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
