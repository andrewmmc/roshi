import { openaiNodeGenerator } from './openai-node';
import {
  makeCodeGenParams,
  makeProvider,
  makeMessage,
} from '@/__tests__/fixtures';

describe('openaiNodeGenerator', () => {
  it('has correct label and language', () => {
    expect(openaiNodeGenerator.label).toBe('Node.js');
    expect(openaiNodeGenerator.language).toBe('javascript');
  });

  describe('generate', () => {
    it('generates basic non-streaming code for default OpenAI', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ baseUrl: 'https://api.openai.com/v1' }),
      });
      const code = openaiNodeGenerator.generate(params);

      expect(code).toContain('import OpenAI from "openai"');
      expect(code).toContain('new OpenAI({})');
      expect(code).toContain('client.chat.completions.create(');
      expect(code).toContain('model: "gpt-4"');
      expect(code).not.toContain('baseURL:');
      expect(code).not.toContain('stream: true');
    });

    it('includes baseURL for non-default provider', () => {
      const code = openaiNodeGenerator.generate(makeCodeGenParams());
      expect(code).toContain('baseURL: "https://api.test.com/v1"');
    });

    it('strips trailing slash from baseURL', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ baseUrl: 'https://api.test.com/v1/' }),
      });
      const code = openaiNodeGenerator.generate(params);
      expect(code).toContain('baseURL: "https://api.test.com/v1"');
    });

    it('includes defaultHeaders for api-key-header auth', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ auth: { type: 'api-key-header' } }),
      });
      const code = openaiNodeGenerator.generate(params);
      expect(code).toContain(
        'defaultHeaders: { "x-api-key": process.env.API_KEY }',
      );
    });

    it('uses custom header name', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({
          auth: { type: 'api-key-header', headerName: 'X-Custom' },
        }),
      });
      const code = openaiNodeGenerator.generate(params);
      expect(code).toContain('"X-Custom"');
    });

    it('includes system prompt as system message', () => {
      const params = makeCodeGenParams({ systemPrompt: 'Be helpful' });
      const code = openaiNodeGenerator.generate(params);
      expect(code).toContain('role: "system", content: "Be helpful"');
    });

    it('omits system prompt when empty', () => {
      const params = makeCodeGenParams({ systemPrompt: '' });
      const code = openaiNodeGenerator.generate(params);
      expect(code).not.toContain('role: "system"');
    });

    it('skips empty messages', () => {
      const params = makeCodeGenParams({
        messages: [
          makeMessage({ content: '' }),
          makeMessage({ content: 'Hi' }),
        ],
      });
      const code = openaiNodeGenerator.generate(params);
      const userMatches = code.match(/role: "user"/g);
      expect(userMatches).toHaveLength(1);
    });

    it('generates streaming code', () => {
      const params = makeCodeGenParams({ stream: true });
      const code = openaiNodeGenerator.generate(params);

      expect(code).toContain('stream: true');
      expect(code).toContain('for await (const chunk of stream)');
    });

    it('includes temperature and max_tokens', () => {
      const params = makeCodeGenParams({ temperature: 0.7, maxTokens: 2048 });
      const code = openaiNodeGenerator.generate(params);
      expect(code).toContain('temperature: 0.7');
      expect(code).toContain('max_tokens: 2048');
    });

    it('escapes special characters in single-line strings', () => {
      const params = makeCodeGenParams({
        messages: [makeMessage({ content: 'He said "hello"' })],
      });
      const code = openaiNodeGenerator.generate(params);
      expect(code).toContain('\\"hello\\"');
    });

    it('uses backtick template for multiline content', () => {
      const params = makeCodeGenParams({
        messages: [makeMessage({ content: 'line1\nline2' })],
      });
      const code = openaiNodeGenerator.generate(params);
      expect(code).toContain('`line1\nline2`');
    });
  });
});
