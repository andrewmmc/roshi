import type { CodeGenerator, CodeGenParams } from './types';

function escapeJSString(s: string): string {
  if (s.includes('\n')) {
    return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
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

export const anthropicNodeGenerator: CodeGenerator = {
  label: 'Node.js (Anthropic SDK)',
  language: 'javascript',

  generate(params: CodeGenParams): string {
    const { provider, model, messages, systemPrompt, temperature, maxTokens, stream } = params;
    const baseUrl = provider.baseUrl.replace(/\/$/, '');
    const isDefaultBase = baseUrl === 'https://api.anthropic.com/v1';

    const clientConfigLines: string[] = [
      '  apiKey: process.env.ANTHROPIC_API_KEY,',
    ];
    if (!isDefaultBase) {
      clientConfigLines.push(`  baseURL: "${baseUrl}",`);
    }

    const messageLines = messages
      .filter((m) => m.content.trim() && m.role !== 'system')
      .map((m) => `    { role: "${m.role === 'assistant' ? 'assistant' : 'user'}", content: ${escapeJSString(m.content)} }`);

    const args: string[] = [
      `  model: "${model}",`,
      `  max_tokens: ${maxTokens},`,
      `  temperature: ${temperature},`,
      '  messages: [',
      messageLines.join(',\n'),
      '  ],',
    ];

    if (systemPrompt.trim()) {
      args.push(`  system: ${escapeJSString(systemPrompt)},`);
    }

    if (stream) {
      return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
${clientConfigLines.join('\n')}
});

const stream = await client.messages.stream({
${args.join('\n')}
});

for await (const text of stream.textStream()) {
  // ...
}
`;
    }

    return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
${clientConfigLines.join('\n')}
});

const response = await client.messages.create({
${args.join('\n')}
});

const content = response.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("");
`;
  },
};
