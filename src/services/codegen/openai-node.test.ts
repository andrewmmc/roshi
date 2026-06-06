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

    it('generates responses code for responses protocol', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ protocol: 'openai-responses' }),
        systemPrompt: 'Be concise',
        maxTokens: 2048,
        effort: 'high',
        verbosity: 'low',
      });
      const code = openaiNodeGenerator.generate(params);

      expect(code).toContain('client.responses.create({');
      expect(code).toContain('instructions: "Be concise"');
      expect(code).toContain('max_output_tokens: 2048');
      expect(code).toContain('input: [');
      expect(code).toContain('reasoning: { effort: "high" }');
      expect(code).toContain('text: { verbosity: "low" }');
      expect(code).toContain('const content = response.output_text');
      expect(code).not.toContain('client.chat.completions.create');
      expect(code).not.toContain('temperature:');
    });

    it('includes only effort in responses code when verbosity is unset', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ protocol: 'openai-responses' }),
        effort: 'medium',
        verbosity: undefined,
      });
      const code = openaiNodeGenerator.generate(params);

      expect(code).toContain('reasoning: { effort: "medium" }');
      expect(code).not.toContain('text: { verbosity:');
    });

    it('includes only verbosity in responses code when effort is unset', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ protocol: 'openai-responses' }),
        effort: undefined,
        verbosity: 'high',
      });
      const code = openaiNodeGenerator.generate(params);

      expect(code).toContain('text: { verbosity: "high" }');
      expect(code).not.toContain('reasoning: { effort:');
    });

    it('generates responses streaming code for OpenAI GPT-5 models', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
        }),
        model: 'gpt-5.5',
        stream: true,
      });
      const code = openaiNodeGenerator.generate(params);

      expect(code).toContain('const stream = await client.responses.create({');
      expect(code).toContain('for await (const event of stream)');
      expect(code).toContain('event.type === "response.output_text.delta"');
      expect(code).not.toContain('client.chat.completions.create');
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
