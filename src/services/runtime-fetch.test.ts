import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tauriFetchMock = vi.hoisted(() => vi.fn());
const isTauriMock = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: isTauriMock,
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: tauriFetchMock,
}));

import { runtimeFetch, shouldUseTauriHttpClient } from './runtime-fetch';

describe('runtimeFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    tauriFetchMock.mockReset();
    isTauriMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses browser fetch during dev', async () => {
    vi.stubEnv('DEV', 'true');
    isTauriMock.mockReturnValue(true);

    await runtimeFetch('https://example.com');

    expect(fetch).toHaveBeenCalledWith('https://example.com', undefined);
    expect(tauriFetchMock).not.toHaveBeenCalled();
    expect(shouldUseTauriHttpClient()).toBe(false);
  });

  it('uses the Tauri HTTP client in production Tauri builds', async () => {
    vi.stubEnv('DEV', '');
    isTauriMock.mockReturnValue(true);
    tauriFetchMock.mockResolvedValue({ ok: true });

    await runtimeFetch('https://example.com', { method: 'POST' });

    expect(tauriFetchMock).toHaveBeenCalledWith('https://example.com', {
      method: 'POST',
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(shouldUseTauriHttpClient()).toBe(true);
  });
});
