import type { ViteDevServer } from 'vite';
import type { IncomingMessage } from 'node:http';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { EnvHttpProxyAgent } from 'undici';
import {
  DEV_HTTP_PROXY_HEADER,
  DEV_HTTPS_PROXY_HEADER,
  DEV_NO_PROXY_HEADER,
} from './proxy-headers';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
} from '../constants/defaults';

const PROXY_TIMEOUT_MS = DEFAULT_REQUEST_TIMEOUT_MS;
const MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
const MAX_REQUEST_BYTES = 10 * 1024 * 1024;

type ResolveHostname = (hostname: string) => Promise<string[]>;

interface DevProxyOptions {
  requestTimeoutMs?: number;
  streamIdleTimeoutMs?: number;
  maxResponseBytes?: number;
  maxRequestBytes?: number;
  resolveHostname?: ResolveHostname;
}

const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'connection',
  'accept-encoding',
  DEV_HTTP_PROXY_HEADER,
  DEV_HTTPS_PROXY_HEADER,
  DEV_NO_PROXY_HEADER,
]);
const SKIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'transfer-encoding',
  'connection',
]);

class RequestBodyTooLargeError extends Error {}

function collectBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytesRead = 0;
    req.on('data', (chunk: Buffer) => {
      bytesRead += chunk.byteLength;
      if (bytesRead > maxBytes) {
        reject(new RequestBodyTooLargeError());
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) !== 6) return true;
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false;
}

async function defaultResolveHostname(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const results = await dnsLookup(hostname, { all: true, verbatim: true });
  return results.map(({ address }) => address);
}

async function validateProxyTarget(
  target: string,
  resolveHostname: ResolveHostname,
): Promise<URL> {
  const url = new URL(target);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid proxy target');
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    throw new Error('Private network targets are not allowed');
  }
  const addresses = await resolveHostname(hostname);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('Private network targets are not allowed');
  }
  return url;
}

export function devProxyPlugin(options: DevProxyOptions = {}) {
  const requestTimeoutMs = options.requestTimeoutMs ?? PROXY_TIMEOUT_MS;
  const streamIdleTimeoutMs =
    options.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;
  const maxRequestBytes = options.maxRequestBytes ?? MAX_REQUEST_BYTES;
  const resolveHostname = options.resolveHostname ?? defaultResolveHostname;

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

        let validatedTarget: URL;
        try {
          validatedTarget = await validateProxyTarget(target, resolveHostname);
        } catch {
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

        let dispatcher: EnvHttpProxyAgent | undefined;
        try {
          let requestBody: Uint8Array | undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const contentLength = Number(req.headers['content-length']);
            if (
              Number.isFinite(contentLength) &&
              contentLength > maxRequestBytes
            ) {
              throw new RequestBodyTooLargeError();
            }
            const buf = await collectBody(req, maxRequestBytes);
            requestBody = new Uint8Array(
              buf.buffer,
              buf.byteOffset,
              buf.byteLength,
            );
            upstreamHeaders.set('content-length', String(requestBody.length));
          }

          const httpProxy = req.headers[DEV_HTTP_PROXY_HEADER];
          const httpsProxy = req.headers[DEV_HTTPS_PROXY_HEADER];
          const noProxy = req.headers[DEV_NO_PROXY_HEADER];
          dispatcher =
            typeof httpProxy === 'string' || typeof httpsProxy === 'string'
              ? new EnvHttpProxyAgent({
                  httpProxy:
                    typeof httpProxy === 'string' ? httpProxy : undefined,
                  httpsProxy:
                    typeof httpsProxy === 'string' ? httpsProxy : undefined,
                  noProxy: typeof noProxy === 'string' ? noProxy : undefined,
                })
              : undefined;

          const upstreamResponse = await fetch(validatedTarget, {
            method: req.method,
            headers: upstreamHeaders,
            body: requestBody,
            signal: abortController.signal,
            redirect: 'error',
            dispatcher,
          } as RequestInit & { dispatcher?: EnvHttpProxyAgent });

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
          if (error instanceof RequestBodyTooLargeError) {
            res.statusCode = 413;
            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({
                error: `Request exceeds ${maxRequestBytes} byte limit`,
              }),
            );
            return;
          }
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
          await dispatcher?.close();
        }
      });
    },
  };
}
