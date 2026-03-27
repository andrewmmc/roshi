import type { ViteDevServer } from 'vite';
import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';

const SKIP_REQUEST_HEADERS = new Set(['host', 'origin', 'referer', 'connection', 'accept-encoding']);
const SKIP_RESPONSE_HEADERS = new Set(['content-encoding', 'transfer-encoding', 'connection']);

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
          upstreamHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
        }

        try {
          let requestBody: Uint8Array | undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const buf = await collectBody(req);
            requestBody = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
            upstreamHeaders.set('content-length', String(requestBody.length));
          }

          const upstreamResponse = await fetch(target, {
            method: req.method,
            headers: upstreamHeaders,
            body: requestBody as NonNullable<RequestInit['body']> | undefined,
            signal: abortController.signal,
          });

          res.statusCode = upstreamResponse.status;
          upstreamResponse.headers.forEach((value, key) => {
            if (SKIP_RESPONSE_HEADERS.has(key)) return;
            res.setHeader(key, value);
          });

          if (!upstreamResponse.body) {
            res.end();
            return;
          }

          Readable.fromWeb(upstreamResponse.body as import('stream/web').ReadableStream).pipe(res);
        } catch (error) {
          if (abortController.signal.aborted) {
            res.end();
            return;
          }

          const message = error instanceof Error ? error.message : 'Proxy request failed';
          res.statusCode = 502;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}
