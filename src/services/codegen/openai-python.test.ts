import { openaiPythonGenerator } from './openai-python';
import {
  makeCodeGenParams,
  makeProvider,
  makeMessage,
} from '@/__tests__/fixtures';

describe('openaiPythonGenerator', () => {
  it('has correct label and language', () => {
    expect(openaiPythonGenerator.label).toBe('Python (OpenAI SDK)');
    expect(openaiPythonGenerator.language).toBe('python');
  });

  describe('generate', () => {
    it('generates basic non-streaming code for default OpenAI', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ baseUrl: 'https://api.openai.com/v1' }),
      });
      const code = openaiPythonGenerator.generate(params);

      expect(code).toContain('from openai import OpenAI');
      expect(code).toContain('client = OpenAI()');
      expect(code).toContain('response = client.chat.completions.create(');
      expect(code).toContain('model="gpt-4"');
      expect(code).not.toContain('base_url=');
      expect(code).not.toContain('stream=True');
      expect(code).not.toContain('import os');
    });

    it('includes base_url for non-default provider', () => {
      const code = openaiPythonGenerator.generate(makeCodeGenParams());
      expect(code).toContain('base_url="https://api.test.com/v1"');
    });

    it('strips trailing slash from base_url', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ baseUrl: 'https://api.test.com/v1/' }),
      });
      const code = openaiPythonGenerator.generate(params);
      expect(code).toContain('base_url="https://api.test.com/v1"');
    });

    it('includes default_headers for api-key-header auth', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({ auth: { type: 'api-key-header' } }),
      });
      const code = openaiPythonGenerator.generate(params);

      expect(code).toContain('import os');
      expect(code).toContain(
        'default_headers={"x-api-key": os.environ.get("API_KEY")}',
      );
    });

    it('uses custom header name for api-key-header', () => {
      const params = makeCodeGenParams({
        provider: makeProvider({
          auth: { type: 'api-key-header', headerName: 'X-Custom' },
        }),
      });
      const code = openaiPythonGenerator.generate(params);
      expect(code).toContain('"X-Custom"');
    });

    it('includes system prompt as system message', () => {
      const params = makeCodeGenParams({ systemPrompt: 'Be helpful' });
      const code = openaiPythonGenerator.generate(params);
      expect(code).toContain('"role": "system", "content": "Be helpful"');
    });

    it('omits system prompt when empty', () => {
      const params = makeCodeGenParams({ systemPrompt: '' });
      const code = openaiPythonGenerator.generate(params);
      expect(code).not.toContain('"role": "system"');
    });

    it('skips empty messages', () => {
      const params = makeCodeGenParams({
        messages: [
          makeMessage({ content: '' }),
          makeMessage({ content: 'Hi' }),
        ],
      });
      const code = openaiPythonGenerator.generate(params);
      const userMatches = code.match(/"role": "user"/g);
      expect(userMatches).toHaveLength(1);
    });

    it('generates streaming code', () => {
      const params = makeCodeGenParams({ stream: true });
      const code = openaiPythonGenerator.generate(params);

      expect(code).toContain('stream=True');
      expect(code).toContain('for chunk in stream:');
      expect(code).toContain('chunk.choices[0].delta.content');
    });

    it('includes temperature and max_tokens', () => {
      const params = makeCodeGenParams({ temperature: 0.7, maxTokens: 2048 });
      const code = openaiPythonGenerator.generate(params);
      expect(code).toContain('temperature=0.7');
      expect(code).toContain('max_tokens=2048');
    });

    it('escapes single-line strings with special chars', () => {
      const params = makeCodeGenParams({
        messages: [makeMessage({ content: 'He said "hello"' })],
      });
      const code = openaiPythonGenerator.generate(params);
      expect(code).toContain('\\"hello\\"');
    });

    it('uses triple-quote for multiline content', () => {
      const params = makeCodeGenParams({
        messages: [makeMessage({ content: 'line1\nline2' })],
      });
      const code = openaiPythonGenerator.generate(params);
      expect(code).toContain('r"""line1\nline2"""');
    });
  });
});
