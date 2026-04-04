import { anthropicPythonGenerator } from './anthropic-python';
import { makeCodeGenParams, makeMessage } from '@/__tests__/fixtures';

describe('anthropicPythonGenerator', () => {
  it('has correct label and language', () => {
    expect(anthropicPythonGenerator.label).toBe('Python');
    expect(anthropicPythonGenerator.language).toBe('python');
  });

  it('generates non-streaming code', () => {
    const code = anthropicPythonGenerator.generate(
      makeCodeGenParams({
        model: 'claude-sonnet-4-20250514',
        topP: 0.9,
        maxTokens: 2048,
      }),
    );

    expect(code).toContain('import anthropic');
    expect(code).toContain('message = client.messages.create(');
    expect(code).toContain('model="claude-sonnet-4-20250514"');
    expect(code).toContain('top_p=0.9');
    expect(code).not.toContain('stream=True');
  });

  it('generates streaming code', () => {
    const code = anthropicPythonGenerator.generate(
      makeCodeGenParams({
        model: 'claude-sonnet-4-20250514',
        topP: 1,
        stream: true,
      }),
    );

    expect(code).toContain('with client.messages.stream(');
    expect(code).toContain('stream=True');
    expect(code).toContain('for text in stream.text_stream:');
  });

  it('includes system prompt and skips empty messages', () => {
    const code = anthropicPythonGenerator.generate(
      makeCodeGenParams({
        model: 'claude-sonnet-4-20250514',
        topP: 1,
        systemPrompt: 'Be direct',
        messages: [
          makeMessage({ content: '' }),
          makeMessage({ content: 'Ping' }),
        ],
      }),
    );

    expect(code).toContain('system="Be direct"');
    expect(code).toContain('{"role": "user", "content": "Ping"}');
    expect(code).not.toContain('{"role": "user", "content": ""}');
  });

  it('uses triple quotes for multiline strings', () => {
    const code = anthropicPythonGenerator.generate(
      makeCodeGenParams({
        model: 'claude-sonnet-4-20250514',
        topP: 1,
        messages: [makeMessage({ content: 'line1\nline2' })],
      }),
    );

    expect(code).toContain('"content": r"""line1\nline2"""');
  });
});
