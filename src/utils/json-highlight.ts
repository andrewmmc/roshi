export type JsonTokenType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'key'
  | 'punctuation';

export interface JsonToken {
  type: JsonTokenType;
  value: string;
}

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}

function readString(
  input: string,
  start: number,
): { value: string; end: number } {
  let value = input[start];
  let index = start + 1;

  while (index < input.length) {
    const char = input[index];
    value += char;
    index++;
    if (char === '\\' && index < input.length) {
      value += input[index];
      index++;
      continue;
    }
    if (char === '"') break;
  }

  return { value, end: index };
}

function readWord(
  input: string,
  start: number,
): { value: string; end: number } {
  let index = start;
  while (index < input.length && /[a-z0-9.+-]/i.test(input[index])) {
    index++;
  }
  return { value: input.slice(start, index), end: index };
}

export function tokenizeJson(input: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let index = 0;
  let expectKey = false;

  while (index < input.length) {
    const char = input[index];

    if (isWhitespace(char)) {
      let end = index + 1;
      while (end < input.length && isWhitespace(input[end])) end++;
      tokens.push({ type: 'punctuation', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '"') {
      const { value, end } = readString(input, index);
      const nextNonSpace = input.slice(end).match(/^\s*([,:}\]])/);
      const isKey = expectKey || nextNonSpace?.[1] === ':';
      tokens.push({ type: isKey ? 'key' : 'string', value });
      expectKey = false;
      index = end;
      continue;
    }

    if (/[-0-9]/.test(char)) {
      const { value, end } = readWord(input, index);
      tokens.push({ type: 'number', value });
      expectKey = false;
      index = end;
      continue;
    }

    if (input.startsWith('true', index) || input.startsWith('false', index)) {
      const value = input.startsWith('true', index) ? 'true' : 'false';
      tokens.push({ type: 'boolean', value });
      expectKey = false;
      index += value.length;
      continue;
    }

    if (input.startsWith('null', index)) {
      tokens.push({ type: 'null', value: 'null' });
      expectKey = false;
      index += 4;
      continue;
    }

    if (char === '{' || char === '[') {
      tokens.push({ type: 'punctuation', value: char });
      expectKey = char === '{';
      index++;
      continue;
    }

    if (char === '}' || char === ']') {
      tokens.push({ type: 'punctuation', value: char });
      expectKey = false;
      index++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'punctuation', value: char });
      expectKey = true;
      index++;
      continue;
    }

    if (char === ':') {
      tokens.push({ type: 'punctuation', value: char });
      expectKey = false;
      index++;
      continue;
    }

    tokens.push({ type: 'punctuation', value: char });
    expectKey = false;
    index++;
  }

  return tokens;
}
