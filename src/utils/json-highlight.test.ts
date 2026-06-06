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

  it('tokenizes arrays, null literals, escaped strings, and unknown punctuation', () => {
    const tokens = tokenizeJson('{"items":["a\\"b",null,true],"note":"x"}');

    expect(tokens).toEqual(
      expect.arrayContaining([
        { type: 'key', value: '"items"' },
        { type: 'punctuation', value: '[' },
        { type: 'string', value: '"a\\"b"' },
        { type: 'null', value: 'null' },
        { type: 'boolean', value: 'true' },
        { type: 'punctuation', value: ']' },
        { type: 'key', value: '"note"' },
        { type: 'string', value: '"x"' },
      ]),
    );

    expect(tokenizeJson('{"x":1}?')).toContainEqual({
      type: 'punctuation',
      value: '?',
    });
  });

  it('classifies quoted values after commas as keys inside objects', () => {
    const tokens = tokenizeJson('{"a":1,"b":2}');

    expect(
      tokens
        .filter((token) => token.type === 'key')
        .map((token) => token.value),
    ).toEqual(['"a"', '"b"']);
  });
});
