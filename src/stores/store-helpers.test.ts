import { describe, expect, it } from 'vitest';
import {
  createLoadGuard,
  removeById,
  replaceById,
  toStoreErrorMessage,
  upsertById,
} from './store-helpers';

describe('store-helpers', () => {
  const items = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
  ];

  it('replaces an item by id', () => {
    expect(replaceById(items, 'b', { name: 'Updated' })).toEqual([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Updated' },
    ]);
  });

  it('removes an item by id', () => {
    expect(removeById(items, 'a')).toEqual([{ id: 'b', name: 'Beta' }]);
  });

  it('upserts items by id', () => {
    expect(upsertById(items, { id: 'c', name: 'Gamma' })).toEqual([
      ...items,
      { id: 'c', name: 'Gamma' },
    ]);
    expect(upsertById(items, { id: 'b', name: 'Updated' })).toEqual([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Updated' },
    ]);
  });

  it('formats store-facing error messages', () => {
    expect(toStoreErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(toStoreErrorMessage('plain', 'fallback')).toBe('plain');
    expect(toStoreErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('coalesces concurrent load guard runs', async () => {
    const guard = createLoadGuard();
    let loaded = false;
    let loadCount = 0;

    const first = guard.run(
      () => loaded,
      async () => {
        loadCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        loaded = true;
      },
    );
    const second = guard.run(
      () => loaded,
      async () => {
        loadCount += 1;
        loaded = true;
      },
    );

    await Promise.all([first, second]);
    expect(loadCount).toBe(1);
    expect(loaded).toBe(true);
  });
});
