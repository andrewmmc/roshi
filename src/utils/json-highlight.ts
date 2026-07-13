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

export interface TokenizeJsonResult {
  tokens: JsonToken[];
  truncated: boolean;
}

export interface TokenizeJsonOptions {
  maxTokens?: number;
}

export const JSON_HIGHLIGHT_MAX_CHARS = 200_000;
export const JSON_HIGHLIGHT_MAX_TOKENS = 10_000;

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}

function isNumberChar(char: string): boolean {
  return (
    (char >= '0' && char <= '9') ||
    char === '-' ||
    char === '+' ||
    char === '.' ||
    char === 'e' ||
    char === 'E'
  );
}

function readStringEnd(input: string, start: number): number {
  let index = start + 1;

  while (index < input.length) {
    const char = input[index];
    if (char === '\\') {
      index = Math.min(index + 2, input.length);
      continue;
    }
    index++;
    if (char === '"') {
      break;
    }
  }

  return index;
}

function readNumberEnd(input: string, start: number): number {
  let index = start;
  while (index < input.length && isNumberChar(input[index])) {
    index++;
  }
  return index;
}

function nextNonWhitespaceChar(input: string, start: number): string | null {
  let index = start;

  while (index < input.length) {
    const char = input[index];
    if (!isWhitespace(char)) {
      return char;
    }
    index++;
  }

  return null;
}

export function tokenizeJsonWithLimit(
  input: string,
  options: TokenizeJsonOptions = {},
): TokenizeJsonResult {
  const { maxTokens } = options;
  const tokens: JsonToken[] = [];
  let index = 0;
  let expectKey = false;

  const pushToken = (type: JsonTokenType, start: number, end: number) => {
    if (maxTokens !== undefined && tokens.length >= maxTokens) {
      return false;
    }

    tokens.push({ type, value: input.slice(start, end) });
    return true;
  };

  while (index < input.length) {
    const char = input[index];

    if (isWhitespace(char)) {
      let end = index + 1;
      while (end < input.length && isWhitespace(input[end])) end++;
      if (!pushToken('punctuation', index, end)) {
        return { tokens, truncated: true };
      }
      index = end;
      continue;
    }

    if (char === '"') {
      const end = readStringEnd(input, index);
      const nextNonSpace = nextNonWhitespaceChar(input, end);
      const isKey = expectKey || nextNonSpace === ':';
      if (!pushToken(isKey ? 'key' : 'string', index, end)) {
        return { tokens, truncated: true };
      }
      expectKey = false;
      index = end;
      continue;
    }

    if (/[-0-9]/.test(char)) {
      const end = readNumberEnd(input, index);
      if (!pushToken('number', index, end)) {
        return { tokens, truncated: true };
      }
      expectKey = false;
      index = end;
      continue;
    }

    if (input.startsWith('true', index) || input.startsWith('false', index)) {
      const value = input.startsWith('true', index) ? 'true' : 'false';
      if (!pushToken('boolean', index, index + value.length)) {
        return { tokens, truncated: true };
      }
      expectKey = false;
      index += value.length;
      continue;
    }

    if (input.startsWith('null', index)) {
      if (!pushToken('null', index, index + 4)) {
        return { tokens, truncated: true };
      }
      expectKey = false;
      index += 4;
      continue;
    }

    if (char === '{' || char === '[') {
      if (!pushToken('punctuation', index, index + 1)) {
        return { tokens, truncated: true };
      }
      expectKey = char === '{';
      index++;
      continue;
    }

    if (char === '}' || char === ']') {
      if (!pushToken('punctuation', index, index + 1)) {
        return { tokens, truncated: true };
      }
      expectKey = false;
      index++;
      continue;
    }

    if (char === ',') {
      if (!pushToken('punctuation', index, index + 1)) {
        return { tokens, truncated: true };
      }
      expectKey = true;
      index++;
      continue;
    }

    if (char === ':') {
      if (!pushToken('punctuation', index, index + 1)) {
        return { tokens, truncated: true };
      }
      expectKey = false;
      index++;
      continue;
    }

    if (!pushToken('punctuation', index, index + 1)) {
      return { tokens, truncated: true };
    }
    expectKey = false;
    index++;
  }

  return { tokens, truncated: false };
}

export function tokenizeJson(input: string): JsonToken[] {
  const { tokens } = tokenizeJsonWithLimit(input);
  return tokens;
}
