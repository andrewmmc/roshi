import { geminiPythonGenerator } from './gemini-python';
import { makeCodeGenParams, makeMessage } from '@/__tests__/fixtures';

describe('geminiPythonGenerator', () => {
  it('has correct label and language', () => {
    expect(geminiPythonGenerator.label).toBe('Python');
    expect(geminiPythonGenerator.language).toBe('python');
  });

  it('generates non-streaming code with config and model-role mapping', () => {
    const code = geminiPythonGenerator.generate(
      makeCodeGenParams({
        model: 'gemini-2.5-pro',
        topP: 0.85,
        frequencyPenalty: 0.25,
        presencePenalty: 0.15,
        messages: [
          makeMessage({ role: 'user', content: 'Hello' }),
          makeMessage({ role: 'assistant', content: 'Hi there' }),
        ],
      }),
    );

    expect(code).toContain('from google import genai');
    expect(code).toContain('from google.genai import types');
    expect(code).toContain('response = client.models.generate_content(');
    expect(code).toContain('model="gemini-2.5-pro"');
    expect(code).toContain('top_p=0.85');
    expect(code).toContain('frequency_penalty=0.25');
    expect(code).toContain('presence_penalty=0.15');
    expect(code).toContain(
      'types.Content(role="model", parts=[types.Part.from_text(text="Hi there")])',
    );
  });

  it('generates streaming code', () => {
    const code = geminiPythonGenerator.generate(
      makeCodeGenParams({
        model: 'gemini-2.0-flash',
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stream: true,
      }),
    );

    expect(code).toContain(
      'for chunk in client.models.generate_content_stream(',
    );
    expect(code).toContain('print(chunk.text, end="", flush=True)');
  });

  it('includes system instruction and skips empty messages', () => {
    const code = geminiPythonGenerator.generate(
      makeCodeGenParams({
        model: 'gemini-2.0-flash',
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        systemPrompt: 'Be concise',
        messages: [
          makeMessage({ content: '' }),
          makeMessage({ content: 'Prompt' }),
        ],
      }),
    );

    expect(code).toContain('system_instruction="Be concise"');
    expect(code).toContain('contents=[');
    expect(code).toContain('"Prompt"');
  });

  it('uses triple quotes for multiline user content', () => {
    const code = geminiPythonGenerator.generate(
      makeCodeGenParams({
        model: 'gemini-2.0-flash',
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        messages: [makeMessage({ content: 'line1\nline2' })],
      }),
    );

    expect(code).toContain('r"""line1\nline2"""');
  });
});
