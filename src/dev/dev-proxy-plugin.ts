import type { ViteDevServer } from 'vite';
import type { IncomingMessage } from 'node:http';

const PROXY_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 50 * 1024 * 1024;

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

export function devProxyPlugin() {
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
        const timeoutId = setTimeout(() => {
          timedOut = true;
          abortController.abort();
        }, PROXY_TIMEOUT_MS);

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

          const contentLength = upstreamResponse.headers.get('content-length');
          if (
            contentLength &&
            Number.parseInt(contentLength, 10) > MAX_RESPONSE_BYTES
          ) {
            abortController.abort();
            res.statusCode = 413;
            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({
                error: `Response exceeds ${MAX_RESPONSE_BYTES} byte limit`,
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
            bytesRead += value.byteLength;
            if (bytesRead > MAX_RESPONSE_BYTES) {
              reader.cancel();
              abortController.abort();
              if (!res.headersSent) {
                res.statusCode = 413;
                res.setHeader('content-type', 'application/json');
              }
              res.end(
                JSON.stringify({
                  error: `Response exceeds ${MAX_RESPONSE_BYTES} byte limit`,
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
          clearTimeout(timeoutId);
        }
      });
    },
  };
}
