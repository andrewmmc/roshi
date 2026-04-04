import { anthropicNodeGenerator } from './anthropic-node';
import { makeCodeGenParams, makeMessage } from '@/__tests__/fixtures';

function makeAnthropicParams() {
  return makeCodeGenParams({
    model: 'claude-sonnet-4-20250514',
    topP: 0.95,
    maxTokens: 1024,
  });
}

describe('anthropicNodeGenerator', () => {
  it('has correct label and language', () => {
    expect(anthropicNodeGenerator.label).toBe('Node.js');
    expect(anthropicNodeGenerator.language).toBe('javascript');
  });

  it('generates non-streaming code', () => {
    const code = anthropicNodeGenerator.generate(makeAnthropicParams());

    expect(code).toContain('import Anthropic from "@anthropic-ai/sdk"');
    expect(code).toContain('const message = await client.messages.create({');
    expect(code).toContain('model: "claude-sonnet-4-20250514"');
    expect(code).toContain('top_p: 0.95');
    expect(code).not.toContain('stream: true');
  });

  it('generates streaming code', () => {
    const code = anthropicNodeGenerator.generate(
      makeCodeGenParams({
        model: 'claude-sonnet-4-20250514',
        topP: 1,
        stream: true,
      }),
    );

    expect(code).toContain('const stream = client.messages.stream({');
    expect(code).toContain('stream: true');
    expect(code).toContain('for await (const event of stream)');
    expect(code).toContain('event.type === "content_block_delta"');
  });

  it('includes system prompt and skips empty messages', () => {
    const code = anthropicNodeGenerator.generate(
      makeCodeGenParams({
        model: 'claude-sonnet-4-20250514',
        topP: 1,
        systemPrompt: 'You are concise',
        messages: [
          makeMessage({ content: '' }),
          makeMessage({ content: 'Hello' }),
        ],
      }),
    );

    expect(code).toContain('system: "You are concise"');
    expect(code).toContain('{ role: "user", content: "Hello" }');
    expect(code).not.toContain('{ role: "user", content: "" }');
  });

  it('uses template literal for multiline strings', () => {
    const code = anthropicNodeGenerator.generate(
      makeCodeGenParams({
        model: 'claude-sonnet-4-20250514',
        topP: 1,
        messages: [makeMessage({ content: 'line1\nline2' })],
      }),
    );

    expect(code).toContain('content: `line1\nline2`');
  });
});
