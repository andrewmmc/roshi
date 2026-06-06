import { describe, expect, it } from 'vitest';
import {
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
});
