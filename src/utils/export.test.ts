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
} from './export';
import type { CurrentRequestExport } from './export';

describe('export', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
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
});
