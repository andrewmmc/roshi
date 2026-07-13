import {
  JSON_HIGHLIGHT_MAX_TOKENS,
  tokenizeJson,
  tokenizeJsonWithLimit,
} from './json-highlight';

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

  it('tokenizes nested whitespace and exponent numbers', () => {
    const tokens = tokenizeJson(
      '{\n  "outer": { "items": [1.5e+2, -3.25, {"deep": "value"}] }\n}',
    );

    expect(tokens).toEqual(
      expect.arrayContaining([
        { type: 'key', value: '"outer"' },
        { type: 'key', value: '"items"' },
        { type: 'number', value: '1.5e+2' },
        { type: 'number', value: '-3.25' },
        { type: 'key', value: '"deep"' },
        { type: 'string', value: '"value"' },
      ]),
    );
  });
});

describe('tokenizeJsonWithLimit', () => {
  it('stops tokenization when the token limit is reached', () => {
    const json = `{"items":[${Array.from({ length: JSON_HIGHLIGHT_MAX_TOKENS })
      .map((_, index) => index)
      .join(',')}]}`;

    const result = tokenizeJsonWithLimit(json, {
      maxTokens: JSON_HIGHLIGHT_MAX_TOKENS,
    });

    expect(result.truncated).toBe(true);
    expect(result.tokens).toHaveLength(JSON_HIGHLIGHT_MAX_TOKENS);
  });
});
