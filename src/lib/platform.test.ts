import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('platform', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects macOS via navigator.platform', async () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
    const { IS_MAC } = await import('./platform');
    expect(IS_MAC).toBe(true);
  });

  it('detects non-Mac via navigator.platform', async () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    const { IS_MAC } = await import('./platform');
    expect(IS_MAC).toBe(false);
  });

  it('formatShortcut returns mac string on macOS', async () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
    const { formatShortcut } = await import('./platform');
    expect(formatShortcut('⌘K', 'Ctrl+K')).toBe('⌘K');
  });

  it('formatShortcut returns other string on non-Mac', async () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    const { formatShortcut } = await import('./platform');
    expect(formatShortcut('⌘K', 'Ctrl+K')).toBe('Ctrl+K');
  });

  it('modKey returns ⌘ on macOS', async () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
    const { modKey } = await import('./platform');
    expect(modKey()).toBe('⌘');
  });

  it('modKey returns Ctrl on non-Mac', async () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    const { modKey } = await import('./platform');
    expect(modKey()).toBe('Ctrl');
  });
});
