import type { ViteDevServer } from 'vite';
import type { IncomingMessage } from 'node:http';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
} from '../constants/defaults';

const PROXY_TIMEOUT_MS = DEFAULT_REQUEST_TIMEOUT_MS;
const MAX_RESPONSE_BYTES = 50 * 1024 * 1024;

interface DevProxyOptions {
  requestTimeoutMs?: number;
  streamIdleTimeoutMs?: number;
  maxResponseBytes?: number;
}

const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'connection',
  'accept-encoding',
]);
const SKIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'transfer-encoding',
  'connection',
]);

function collectBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function devProxyPlugin(options: DevProxyOptions = {}) {
  const requestTimeoutMs = options.requestTimeoutMs ?? PROXY_TIMEOUT_MS;
  const streamIdleTimeoutMs =
    options.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;

  return {
    name: 'dev-dynamic-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        const requestUrl = new URL(req.url ?? '', 'http://localhost');
        const target = requestUrl.searchParams.get('url');

        if (!target) {
          res.statusCode = 400;
          res.end('Missing "url" query parameter');
          return;
        }

        if (!/^https?:\/\//.test(target)) {
          res.statusCode = 400;
          res.end('Invalid proxy target');
          return;
        }

        const abortController = new AbortController();
        res.on('close', () => {
          if (!res.writableFinished) abortController.abort();
        });

        const upstreamHeaders = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (!value) continue;
          if (SKIP_REQUEST_HEADERS.has(key)) continue;
          upstreamHeaders.set(
            key,
            Array.isArray(value) ? value.join(', ') : value,
          );
        }

        let timedOut = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const clearTimeoutTimer = () => {
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
        };
        const armTimeout = (timeoutMs: number) => {
          clearTimeoutTimer();
          timeoutId = setTimeout(() => {
            timedOut = true;
            abortController.abort();
          }, timeoutMs);
        };

        // Limit time to first upstream response headers. Once an SSE stream is
        // established, reset the timer for each received chunk so a healthy
        // long-running stream is not cut off by a wall-clock deadline.
        armTimeout(requestTimeoutMs);

        try {
          let requestBody: Uint8Array | undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const buf = await collectBody(req);
            requestBody = new Uint8Array(
              buf.buffer,
              buf.byteOffset,
              buf.byteLength,
            );
            upstreamHeaders.set('content-length', String(requestBody.length));
          }

          const upstreamResponse = await fetch(target, {
            method: req.method,
            headers: upstreamHeaders,
            body: requestBody as NonNullable<RequestInit['body']> | undefined,
            signal: abortController.signal,
          });

          const isSse = upstreamResponse.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('text/event-stream');
          if (isSse) {
            armTimeout(streamIdleTimeoutMs);
          }

          const contentLength = upstreamResponse.headers.get('content-length');
          if (
            contentLength &&
            Number.parseInt(contentLength, 10) > maxResponseBytes
          ) {
            abortController.abort();
            res.statusCode = 413;
            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({
                error: `Response exceeds ${maxResponseBytes} byte limit`,
              }),
            );
            return;
          }

          res.statusCode = upstreamResponse.status;
          upstreamResponse.headers.forEach((value, key) => {
            if (SKIP_RESPONSE_HEADERS.has(key)) return;
            res.setHeader(key, value);
          });

          if (!upstreamResponse.body) {
            res.end();
            return;
          }

          let bytesRead = 0;
          const reader = upstreamResponse.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (isSse) armTimeout(streamIdleTimeoutMs);
            bytesRead += value.byteLength;
            if (bytesRead > maxResponseBytes) {
              reader.cancel();
              abortController.abort();
              if (res.headersSent) {
                // The upstream response has already started. Appending a JSON
                // error would corrupt its body (especially an SSE stream), so
                // terminate the connection and let the client surface a stream
                // interruption instead.
                res.destroy();
                return;
              }
              res.statusCode = 413;
              res.setHeader('content-type', 'application/json');
              res.end(
                JSON.stringify({
                  error: `Response exceeds ${maxResponseBytes} byte limit`,
                }),
              );
              return;
            }
            res.write(value);
          }
          res.end();
        } catch (error) {
          if (abortController.signal.aborted && !timedOut) {
            res.end();
            return;
          }

          if (timedOut) {
            if (res.headersSent) {
              res.destroy();
              return;
            }
            res.statusCode = 504;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'Proxy request timed out' }));
            return;
          }

          const message =
            error instanceof Error ? error.message : 'Proxy request failed';
          res.statusCode = 502;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        } finally {
          clearTimeoutTimer();
        }
      });
    },
  };
}
