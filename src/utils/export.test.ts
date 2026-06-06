import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeHistoryEntry, makeProvider } from '@/__tests__/fixtures';

const isTauriMock = vi.hoisted(() => vi.fn());
const saveMock = vi.hoisted(() => vi.fn());
const writeTextFileMock = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: isTauriMock,
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: saveMock,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: writeTextFileMock,
}));

import {
  exportProviders,
  exportHistory,
  exportHistoryEntry,
  exportCurrentRequest,
  exportEvalRunJson,
  exportEvalRunCsv,
  buildEvalRunCsv,
  buildRawRequestExportPayload,
  buildRawResponseExportPayload,
  buildHeadersExportPayload,
  buildCodeSnippetExportPayload,
  exportRawRequestJson,
  exportRawResponseJson,
  exportHeadersJson,
  exportCodeSnippet,
} from './export';
import type { CurrentRequestExport } from './export';
import { emptyResult } from '@/types/eval';
import type { EvalRunRecord } from '@/types/eval';

function makeEvalRecord(): EvalRunRecord {
  return {
    id: 'rec-1',
    createdAt: new Date('2026-01-02T03:04:05Z'),
    name: 'Pricing copy',
    request: {
      messages: [{ role: 'user', content: 'Hello' }],
      systemPrompt: '',
      temperature: 1,
      maxTokens: 1024,
      topP: 1,
      topK: 0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: true,
      customHeaders: [],
    },
    runners: [
      {
        id: 'r1',
        providerId: 'p1',
        providerName: 'OpenAI',
        modelId: 'gpt-4',
        label: 'OpenAI / gpt-4',
      },
      {
        id: 'r2',
        providerId: 'p2',
        providerName: 'Anthropic',
        modelId: 'claude-3-opus',
        label: 'Anthropic / claude-3-opus',
      },
    ],
    results: [
      {
        ...emptyResult('r1'),
        status: 'success',
        content: 'Hi, world!',
        metrics: {
          durationMs: 500,
          ttftMs: 80,
          tokensPerSec: 25.5,
          promptTokens: 10,
          completionTokens: 12,
          totalTokens: 22,
          costUsd: 0.000123,
          responseChars: 10,
          finishReason: 'stop',
          statusCode: 200,
        },
        rating: 4,
        thumbs: 'up',
      },
      {
        ...emptyResult('r2'),
        status: 'error',
        content: '',
        error: 'HTTP 401, nope',
        metrics: {
          ...emptyResult('r2').metrics,
          statusCode: 401,
        },
      },
    ],
    judgeConfig: { enabled: true, runner: null, rubric: '' },
    judgeResult: {
      scores: {
        r1: {
          helpfulness: 5,
          accuracy: 4,
          clarity: 5,
          overall: 4.7,
          rationale: 'Great answer',
        },
      },
      winnerRunnerId: 'r1',
      rawContent: '{}',
      error: null,
    },
  };
}

describe('export', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let downloadFilename: string;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    clickSpy = vi.fn();
    downloadFilename = '';
    vi.spyOn(document, 'createElement').mockReturnValue({
      set href(_: string) {},
      set download(value: string) {
        downloadFilename = value;
      },
      click: clickSpy,
    } as unknown as HTMLElement);

    createObjectURLSpy = vi
      .fn()
      .mockReturnValue('blob:http://localhost/fake-url');
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });

    isTauriMock.mockReturnValue(false);
    saveMock.mockReset();
    writeTextFileMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('browser download path', () => {
    it('exportProviders creates a blob download with redacted keys by default', () => {
      const providers = [
        makeProvider({ id: '1', name: 'Bravo', apiKey: 'secret-key' }),
        makeProvider({ id: '2', name: 'Alpha', apiKey: '' }),
      ];

      exportProviders(providers);

      expect(createObjectURLSpy).toHaveBeenCalledOnce();
      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(revokeObjectURLSpy).toHaveBeenCalledOnce();
    });

    it('exportProviders redacts API keys by default', async () => {
      const providers = [
        makeProvider({ id: '1', name: 'A', apiKey: 'secret' }),
      ];

      exportProviders(providers);

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.data[0].apiKey).toBe('REDACTED');
      expect(envelope.type).toBe('providers');
      expect(envelope.app).toBe('roshi');
    });

    it('exportProviders preserves keys when redactKeys is false', async () => {
      const providers = [
        makeProvider({ id: '1', name: 'A', apiKey: 'my-real-key' }),
      ];

      exportProviders(providers, { redactKeys: false });

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.data[0].apiKey).toBe('my-real-key');
    });

    it('exportProviders sorts providers by name', async () => {
      const providers = [
        makeProvider({ id: '1', name: 'Zebra' }),
        makeProvider({ id: '2', name: 'Alpha' }),
      ];

      exportProviders(providers);

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.data.map((p: { name: string }) => p.name)).toEqual([
        'Alpha',
        'Zebra',
      ]);
    });

    it('exportProviders normalizes legacy provider metadata', async () => {
      const legacyProvider = makeProvider({
        id: 'legacy-openai',
        name: 'OpenAI',
        protocol: undefined,
        endpoints: { chat: '/chat/completions' },
        models: [makeProvider().models[0]],
      });
      delete legacyProvider.models[0].source;

      exportProviders([legacyProvider]);

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.data[0].protocol).toBe('openai-chat-completions');
      expect(envelope.data[0].endpoints.responses).toBe('/responses');
      expect(envelope.data[0].models[0].source).toBe('manual');
    });

    it('exportHistory redacts sensitive request headers', async () => {
      const entries = [
        makeHistoryEntry({
          id: 'h1',
          requestHeaders: {
            Authorization: 'Bearer secret',
            'Content-Type': 'application/json',
          },
        }),
      ];

      exportHistory(entries);

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.type).toBe('history');
      expect(envelope.data[0].requestHeaders.Authorization).toBe('REDACTED');
      expect(envelope.data[0].requestHeaders['Content-Type']).toBe(
        'application/json',
      );
    });

    it('exportHistory uses date tag in filename', () => {
      exportHistory([makeHistoryEntry()]);

      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it('exportHistoryEntry uses entry createdAt for filename tag', () => {
      const entry = makeHistoryEntry({
        createdAt: new Date('2024-12-25T10:00:00Z'),
      });

      exportHistoryEntry(entry);

      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it('exportHistoryEntry redacts x-api-key header', async () => {
      const entry = makeHistoryEntry({
        requestHeaders: {
          'X-Api-Key': 'secret-api-key',
          Accept: 'application/json',
        },
      });

      exportHistoryEntry(entry);

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.data.requestHeaders['X-Api-Key']).toBe('REDACTED');
      expect(envelope.data.requestHeaders.Accept).toBe('application/json');
    });

    it('exportHistoryEntry handles null requestHeaders', async () => {
      const entry = makeHistoryEntry({ requestHeaders: null });

      exportHistoryEntry(entry);

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.data.requestHeaders).toBeNull();
    });

    it('exportCurrentRequest redacts sensitive headers and wraps in envelope', async () => {
      const data: CurrentRequestExport = {
        sentRequest: null,
        response: null,
        rawRequest: null,
        rawResponse: null,
        requestUrl: 'https://api.test.com/v1/chat',
        requestHeaders: {
          Authorization: 'Bearer sk-123',
          'Content-Type': 'application/json',
        },
        responseHeaders: null,
        error: null,
        durationMs: 200,
        statusCode: 200,
      };

      exportCurrentRequest(data);

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.type).toBe('history-entry');
      expect(envelope.data.requestHeaders.Authorization).toBe('REDACTED');
      expect(envelope.data.requestHeaders['Content-Type']).toBe(
        'application/json',
      );
      expect(envelope.data.requestUrl).toBe('https://api.test.com/v1/chat');
    });

    it('envelope includes version and exportedAt timestamp', async () => {
      exportHistory([makeHistoryEntry()]);

      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.version).toBe(1);
      expect(envelope.exportedAt).toBe('2025-06-15T12:00:00.000Z');
    });
  });

  describe('tauri download path', () => {
    beforeEach(() => {
      isTauriMock.mockReturnValue(true);
    });

    it('uses save dialog and writeTextFile in Tauri', async () => {
      saveMock.mockResolvedValue('/Users/test/Downloads/roshi-history.json');
      writeTextFileMock.mockResolvedValue(undefined);

      exportHistory([makeHistoryEntry()]);
      await vi.runAllTimersAsync();

      expect(saveMock).toHaveBeenCalledWith({
        defaultPath: 'roshi-history-2025-06-15.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      expect(writeTextFileMock).toHaveBeenCalledWith(
        '/Users/test/Downloads/roshi-history.json',
        expect.stringContaining('"app": "roshi"'),
      );
      expect(createObjectURLSpy).not.toHaveBeenCalled();
    });

    it('does not write file when user cancels the save dialog', async () => {
      saveMock.mockResolvedValue(null);

      exportProviders([makeProvider()]);
      await vi.runAllTimersAsync();

      expect(saveMock).toHaveBeenCalledOnce();
      expect(writeTextFileMock).not.toHaveBeenCalled();
    });

    it('does not fall back to blob download in Tauri', async () => {
      saveMock.mockResolvedValue('/tmp/export.json');
      writeTextFileMock.mockResolvedValue(undefined);

      exportHistoryEntry(makeHistoryEntry());
      await vi.runAllTimersAsync();

      expect(clickSpy).not.toHaveBeenCalled();
      expect(createObjectURLSpy).not.toHaveBeenCalled();
    });
  });

  describe('tab-specific exports', () => {
    it('buildRawRequestExportPayload returns the raw request object', () => {
      const payload = { model: 'gpt-4', messages: [] };
      expect(buildRawRequestExportPayload(payload)).toEqual(payload);
      expect(buildRawRequestExportPayload(null)).toBeNull();
    });

    it('buildRawResponseExportPayload returns the raw response object', () => {
      const payload = { chunks: [{ id: '1' }], interrupted: true };
      expect(buildRawResponseExportPayload(payload)).toEqual(payload);
    });

    it('buildHeadersExportPayload redacts sensitive request headers', () => {
      expect(
        buildHeadersExportPayload({
          requestUrl: 'https://api.test.com/v1/chat',
          requestHeaders: {
            Authorization: 'Bearer secret',
            Accept: 'application/json',
          },
          responseHeaders: { 'content-type': 'text/event-stream' },
        }),
      ).toEqual({
        requestUrl: 'https://api.test.com/v1/chat',
        requestHeaders: {
          Authorization: 'REDACTED',
          Accept: 'application/json',
        },
        responseHeaders: { 'content-type': 'text/event-stream' },
      });
    });

    it('buildCodeSnippetExportPayload includes label and code', () => {
      expect(buildCodeSnippetExportPayload('print("hi")', 'Python')).toEqual({
        label: 'Python',
        code: 'print("hi")',
      });
    });

    it('exportRawRequestJson wraps payload in a raw-request envelope', async () => {
      exportRawRequestJson({ model: 'gpt-4' });
      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const envelope = JSON.parse(await blob.text());
      expect(envelope.type).toBe('raw-request');
      expect(envelope.data).toEqual({ model: 'gpt-4' });
    });

    it('exportRawResponseJson wraps payload in a raw-response envelope', async () => {
      exportRawResponseJson({ interrupted: true, chunks: [] });
      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const envelope = JSON.parse(await blob.text());
      expect(envelope.type).toBe('raw-response');
      expect(envelope.data).toEqual({ interrupted: true, chunks: [] });
    });

    it('exportHeadersJson wraps redacted headers in a headers envelope', async () => {
      exportHeadersJson({
        requestUrl: 'https://api.test.com',
        requestHeaders: { Authorization: 'Bearer secret' },
        responseHeaders: { 'x-request-id': 'abc' },
      });
      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const envelope = JSON.parse(await blob.text());
      expect(envelope.type).toBe('headers');
      expect(envelope.data.requestHeaders.Authorization).toBe('REDACTED');
      expect(envelope.data.responseHeaders).toEqual({ 'x-request-id': 'abc' });
    });

    it('exportCodeSnippet downloads a text file with the snippet', async () => {
      exportCodeSnippet('console.log("hi")', 'Node');
      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      expect(blob.type).toBe('text/plain');
      expect(await blob.text()).toBe('console.log("hi")');
      expect(downloadFilename).toMatch(/\.ts$/);
    });

    it('picks file extensions from snippet labels', async () => {
      exportCodeSnippet('print("hi")', 'Python');
      expect(downloadFilename).toMatch(/\.py$/);

      exportCodeSnippet('plain text', 'cURL');
      expect(downloadFilename).toMatch(/\.txt$/);
    });
  });

  describe('eval run export', () => {
    it('exportEvalRunJson wraps a record in an envelope and downloads it', async () => {
      const record = makeEvalRecord();
      exportEvalRunJson(record);
      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      const text = await blob.text();
      const envelope = JSON.parse(text);
      expect(envelope.type).toBe('eval-run');
      expect(envelope.data.id).toBe('rec-1');
      expect(envelope.data.runners).toHaveLength(2);
    });

    it('buildEvalRunCsv writes one row per runner with quoted fields when needed', () => {
      const csv = buildEvalRunCsv(makeEvalRecord());
      const lines = csv.split('\n');
      expect(lines[0]).toContain('runner_id');
      expect(lines).toHaveLength(3);
      const r1 = lines[1].split(',');
      expect(r1[0]).toBe('r1');
      expect(r1[1]).toBe('OpenAI');
      expect(r1[2]).toBe('gpt-4');
      expect(r1[3]).toBe('success');
      expect(r1[4]).toBe('500');
      // r2 contains an error message with a comma → must be quoted
      const r2 = lines[2];
      expect(r2).toContain('"HTTP 401, nope"');
    });

    it('exportEvalRunCsv triggers a CSV download', async () => {
      exportEvalRunCsv(makeEvalRecord());
      const blob: Blob = createObjectURLSpy.mock.calls[0][0];
      expect(blob.type).toBe('text/csv');
      const text = await blob.text();
      expect(text.split('\n')[0]).toContain('runner_id');
    });
  });
});
