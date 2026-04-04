import { geminiNodeGenerator } from './gemini-node';
import { makeCodeGenParams, makeMessage } from '@/__tests__/fixtures';

describe('geminiNodeGenerator', () => {
  it('has correct label and language', () => {
    expect(geminiNodeGenerator.label).toBe('Node.js');
    expect(geminiNodeGenerator.language).toBe('javascript');
  });

  it('generates non-streaming code with config and model-role mapping', () => {
    const code = geminiNodeGenerator.generate(
      makeCodeGenParams({
        model: 'gemini-2.5-pro',
        topP: 0.8,
        frequencyPenalty: 0.2,
        presencePenalty: 0.1,
        messages: [
          makeMessage({ role: 'user', content: 'Hello' }),
          makeMessage({ role: 'assistant', content: 'Hi there' }),
        ],
      }),
    );

    expect(code).toContain('import { GoogleGenAI } from "@google/genai"');
    expect(code).toContain('await ai.models.generateContent({');
    expect(code).toContain('model: "gemini-2.5-pro"');
    expect(code).toContain('topP: 0.8');
    expect(code).toContain('frequencyPenalty: 0.2');
    expect(code).toContain('presencePenalty: 0.1');
    expect(code).toContain('{ role: "model", parts: [{ text: "Hi there" }] }');
  });

  it('generates streaming code', () => {
    const code = geminiNodeGenerator.generate(
      makeCodeGenParams({
        model: 'gemini-2.0-flash',
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stream: true,
      }),
    );

    expect(code).toContain('await ai.models.generateContentStream({');
    expect(code).toContain('for await (const chunk of response)');
    expect(code).toContain('process.stdout.write(chunk.text ?? "")');
  });

  it('includes system instruction and skips empty messages', () => {
    const code = geminiNodeGenerator.generate(
      makeCodeGenParams({
        model: 'gemini-2.0-flash',
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        systemPrompt: 'Always be brief',
        messages: [
          makeMessage({ content: '' }),
          makeMessage({ content: 'Question' }),
        ],
      }),
    );

    expect(code).toContain('systemInstruction: "Always be brief"');
    expect(code).toContain('contents: [');
    expect(code).toContain('"Question"');
    expect(code).not.toContain('""');
  });

  it('uses template literal for multiline user content', () => {
    const code = geminiNodeGenerator.generate(
      makeCodeGenParams({
        model: 'gemini-2.0-flash',
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        messages: [makeMessage({ content: 'line1\nline2' })],
      }),
    );

    expect(code).toContain('`line1\nline2`');
  });
});
