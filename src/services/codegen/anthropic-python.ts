import type { CodeGenerator, CodeGenParams } from './types';

function escapePythonString(s: string): string {
  if (s.includes('\n')) {
    return 'r"""' + s.replace(/"""/g, '""\\"') + '"""';
  }
  return (
    '"' +
    s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n') +
    '"'
  );
}

export const anthropicPythonGenerator: CodeGenerator = {
  label: 'Python (Anthropic SDK)',
  language: 'python',

  generate(params: CodeGenParams): string {
    const { provider, model, messages, systemPrompt, temperature, maxTokens, stream } = params;
    const baseUrl = provider.baseUrl.replace(/\/$/, '');
    const isDefaultBase = baseUrl === 'https://api.anthropic.com/v1';

    const clientArgs: string[] = ['    api_key=os.environ.get("ANTHROPIC_API_KEY")'];
    if (!isDefaultBase) {
      clientArgs.push(`    base_url="${baseUrl}"`);
    }

    const messageLines = messages
      .filter((m) => m.content.trim() && m.role !== 'system')
      .map((m) => `        {"role": "${m.role === 'assistant' ? 'assistant' : 'user'}", "content": ${escapePythonString(m.content)}}`);

    const kwargs: string[] = [
      `    model="${model}",`,
      `    max_tokens=${maxTokens},`,
      `    temperature=${temperature},`,
      '    messages=[',
      messageLines.join(',\n'),
      '    ],',
    ];

    if (systemPrompt.trim()) {
      kwargs.push(`    system=${escapePythonString(systemPrompt)},`);
    }

    if (stream) {
      return `import os

from anthropic import Anthropic

client = Anthropic(
${clientArgs.join(',\n')}
)

with client.messages.stream(
${kwargs.join('\n')}
) as stream:
    for text in stream.text_stream:
        ...
`;
    }

    return `import os

from anthropic import Anthropic

client = Anthropic(
${clientArgs.join(',\n')}
)

response = client.messages.create(
${kwargs.join('\n')}
)

content = "".join(block.text for block in response.content if block.type == "text")
`;
  },
};
