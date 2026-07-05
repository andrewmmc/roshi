import {
  buildAnthropicThinkingArgs,
  buildAnthropicThinkingPythonKwargs,
  escapeJSString,
  escapePythonString,
  formatJsHeaderEntries,
  formatPythonHeaderEntries,
  getSendableMessages,
  isOpus47OrNewer,
  isSendableMessage,
  mergeCodegenCustomHeaders,
  shouldGenerateOpenAIResponses,
} from './shared';
import { makeMessage, makeProvider, makeRequest } from '@/__tests__/fixtures';

describe('codegen shared helpers', () => {
  describe('escapeJSString', () => {
    it('wraps single-line strings in double quotes with escapes', () => {
      expect(escapeJSString('He said "hello"\\')).toBe(
        '"He said \\"hello\\"\\\\"',
      );
    });

    it('uses template literals for multiline strings', () => {
      expect(escapeJSString('line1\nline2')).toBe('`line1\nline2`');
    });
  });

  describe('escapePythonString', () => {
    it('wraps single-line strings in double quotes with escapes', () => {
      expect(escapePythonString('He said "hello"\\')).toBe(
        '"He said \\"hello\\"\\\\"',
      );
    });

    it('uses raw triple quotes for multiline strings', () => {
      expect(escapePythonString('line1\nline2')).toBe('r"""line1\nline2"""');
    });
  });

  describe('isSendableMessage', () => {
    it('accepts messages with content or attachments', () => {
      expect(isSendableMessage(makeMessage({ content: 'Hi' }))).toBe(true);
      expect(
        isSendableMessage(
          makeMessage({
            content: '',
            attachments: [
              {
                id: 'a1',
                filename: 'image.png',
                mimeType: 'image/png',
                data: 'data:image/png;base64,abc',
              },
            ],
          }),
        ),
      ).toBe(true);
    });

    it('rejects whitespace-only messages without attachments', () => {
      expect(isSendableMessage(makeMessage({ content: '   ' }))).toBe(false);
      expect(isSendableMessage(makeMessage({ content: '' }))).toBe(false);
    });
  });

  describe('getSendableMessages', () => {
    it('filters out empty messages', () => {
      expect(
        getSendableMessages([
          makeMessage({ content: '' }),
          makeMessage({ content: 'Keep me' }),
        ]),
      ).toEqual([makeMessage({ content: 'Keep me' })]);
    });
  });

  describe('shouldGenerateOpenAIResponses', () => {
    it('returns true for responses protocol or OpenAI GPT-5 models', () => {
      expect(
        shouldGenerateOpenAIResponses(
          makeProvider({ protocol: 'openai-responses' }),
          'gpt-4',
        ),
      ).toBe(true);
      expect(
        shouldGenerateOpenAIResponses(
          makeProvider({ name: 'OpenAI', type: 'openai-compatible' }),
          'gpt-5.5',
        ),
      ).toBe(true);
    });

    it('returns false for unrelated providers and models', () => {
      expect(shouldGenerateOpenAIResponses(makeProvider(), 'gpt-4')).toBe(
        false,
      );
    });
  });

  describe('mergeCodegenCustomHeaders', () => {
    it('merges provider and request headers and drops blank entries', () => {
      expect(
        mergeCodegenCustomHeaders(
          makeProvider({
            customHeaders: {
              'X-Provider': 'provider',
              ' ': 'skip',
              'X-Blank': '   ',
            },
          }),
          {
            'X-Request': 'request',
            'X-Provider': 'override',
            '': 'skip-me',
          },
        ),
      ).toEqual({
        'X-Provider': 'override',
        'X-Request': 'request',
      });
    });
  });

  describe('format header entries', () => {
    it('formats JS header entries', () => {
      expect(formatJsHeaderEntries({ 'X-Test': 'value' })).toEqual([
        '    "X-Test": "value",',
      ]);
    });

    it('formats Python header entries', () => {
      expect(formatPythonHeaderEntries({ 'X-Test': 'value' })).toEqual([
        '        "X-Test": "value",',
      ]);
    });
  });

  describe('isOpus47OrNewer', () => {
    it('matches claude-opus-4-7 model ids', () => {
      expect(isOpus47OrNewer('claude-opus-4-7')).toBe(true);
      expect(isOpus47OrNewer('claude-opus-4-7-20260219')).toBe(true);
      expect(isOpus47OrNewer('claude-sonnet-4-20250514')).toBe(false);
    });
  });

  describe('buildAnthropicThinkingArgs', () => {
    it('returns nothing when thinking is disabled', () => {
      expect(buildAnthropicThinkingArgs(makeRequest())).toEqual([]);
    });

    it('uses adaptive thinking for opus 4.7 and newer', () => {
      expect(
        buildAnthropicThinkingArgs(
          makeRequest({
            model: 'claude-opus-4-7',
            thinking: { enabled: true, budgetTokens: 1024 },
            effort: 'medium',
          }),
        ),
      ).toEqual([
        '  thinking: { type: "adaptive" },',
        '  output_config: { effort: "medium" },',
      ]);
    });

    it('uses enabled thinking with budget for older models', () => {
      expect(
        buildAnthropicThinkingArgs(
          makeRequest({
            model: 'claude-sonnet-4-20250514',
            thinking: { enabled: true, budgetTokens: 2048 },
          }),
        ),
      ).toEqual(['  thinking: { type: "enabled", budget_tokens: 2048 },']);
    });
  });

  describe('buildAnthropicThinkingPythonKwargs', () => {
    it('returns nothing when thinking is disabled', () => {
      expect(buildAnthropicThinkingPythonKwargs(makeRequest())).toEqual([]);
    });

    it('uses adaptive thinking for opus 4.7 and newer', () => {
      expect(
        buildAnthropicThinkingPythonKwargs(
          makeRequest({
            model: 'claude-opus-4-7',
            thinking: { enabled: true, budgetTokens: 1024 },
          }),
        ),
      ).toEqual([
        '    thinking={"type": "adaptive"},',
        '    output_config={"effort": "high"},',
      ]);
    });

    it('uses enabled thinking with budget for older models', () => {
      expect(
        buildAnthropicThinkingPythonKwargs(
          makeRequest({
            model: 'claude-sonnet-4-20250514',
            thinking: { enabled: true, budgetTokens: 512 },
          }),
        ),
      ).toEqual(['    thinking={"type": "enabled", "budget_tokens": 512},']);
    });
  });
});
