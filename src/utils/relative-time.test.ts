import { formatRelativeTime } from './relative-time';

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats seconds, minutes, hours, and days', () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-07-01T00:00:00.000Z').getTime(),
    );

    expect(formatRelativeTime('2026-06-30T23:59:45.000Z')).toBe('15s ago');
    expect(formatRelativeTime('2026-06-30T23:45:00.000Z')).toBe('15m ago');
    expect(formatRelativeTime('2026-06-30T21:00:00.000Z')).toBe('3h ago');
    expect(formatRelativeTime('2026-06-29T00:00:00.000Z')).toBe('2d ago');
  });

  it('clamps future timestamps to 0 seconds ago', () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-07-01T00:00:00.000Z').getTime(),
    );

    expect(formatRelativeTime('2026-07-01T00:00:10.000Z')).toBe('0s ago');
  });
});
