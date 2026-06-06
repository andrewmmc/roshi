import { tokenizeJson } from './json-highlight';

describe('tokenizeJson', () => {
  it('tokenizes keys, strings, numbers, booleans, and null', () => {
    const tokens = tokenizeJson(
      '{\n  "model": "gpt-4o-mini",\n  "stream": false,\n  "max_tokens": 1\n}',
    );

    expect(tokens).toEqual(
      expect.arrayContaining([
        { type: 'key', value: '"model"' },
        { type: 'string', value: '"gpt-4o-mini"' },
        { type: 'boolean', value: 'false' },
        { type: 'number', value: '1' },
      ]),
    );
  });
});
