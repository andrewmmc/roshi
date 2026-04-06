import { sortProvidersByName } from '@/utils/sort-providers';
import { makeProvider } from '@/__tests__/fixtures';

describe('sortProvidersByName', () => {
  it('sorts by name A–Z, case-insensitive', () => {
    const a = makeProvider({ id: '1', name: 'zebra' });
    const b = makeProvider({ id: '2', name: 'Alpha' });
    const c = makeProvider({ id: '3', name: 'beta' });

    expect(sortProvidersByName([a, b, c]).map((p) => p.name)).toEqual([
      'Alpha',
      'beta',
      'zebra',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [
      makeProvider({ id: '2', name: 'B' }),
      makeProvider({ id: '1', name: 'A' }),
    ];
    sortProvidersByName(input);
    expect(input[0].name).toBe('B');
  });
});
