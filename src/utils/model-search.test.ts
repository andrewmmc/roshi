import { makeModel } from '@/__tests__/fixtures';
import { filterModelsBySearch, matchesModelSearch } from './model-search';

describe('model-search', () => {
  const models = [
    makeModel({ id: 'gpt-4o', displayName: 'GPT-4o', name: 'gpt-4o' }),
    makeModel({
      id: 'claude-3-5',
      displayName: 'Claude 3.5 Sonnet',
      name: 'claude-3-5-sonnet',
    }),
  ];

  it('matches model id, display name, and name', () => {
    expect(matchesModelSearch(models[0], 'gpt-4')).toBe(true);
    expect(matchesModelSearch(models[0], '4o')).toBe(true);
    expect(matchesModelSearch(models[1], 'sonnet')).toBe(true);
    expect(matchesModelSearch(models[1], 'claude-3-5')).toBe(true);
    expect(matchesModelSearch(models[0], 'anthropic')).toBe(false);
  });

  it('treats blank search as a match for all models', () => {
    expect(matchesModelSearch(models[0], '')).toBe(true);
    expect(matchesModelSearch(models[0], '   ')).toBe(true);
    expect(filterModelsBySearch(models, '')).toEqual(models);
  });

  it('filters model lists by search query', () => {
    expect(filterModelsBySearch(models, 'claude')).toEqual([models[1]]);
    expect(filterModelsBySearch(models, 'missing')).toEqual([]);
  });

  it('handles models with missing optional name fields', () => {
    const sparse = makeModel({
      id: 'sparse-model',
      displayName: '',
      name: '',
    });
    expect(matchesModelSearch(sparse, 'sparse')).toBe(true);
    expect(matchesModelSearch(sparse, 'missing')).toBe(false);
  });

  it('matches on the internal name when display name differs', () => {
    const model = makeModel({
      id: 'model-id',
      displayName: 'Friendly Label',
      name: 'internal-model-name',
    });

    expect(matchesModelSearch(model, 'internal-model')).toBe(true);
    expect(matchesModelSearch(model, 'friendly')).toBe(true);
  });
});
