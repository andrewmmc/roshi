import type { CodeGenerator, CodeGenParams } from './types';

function escapeJSString(s: string): string {
  if (s.includes('\n')) {
    return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
  }
  return (
    '"' +
    s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') +
    '"'
  );
}

export const anthropicNodeGenerator: CodeGenerator = {
  label: 'Node.js',
  language: 'javascript',

  generate(params: CodeGenParams): string {
    const {
      model,
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      topP,
      stream,
    } = params;

    const messageLines: string[] = [];
    for (const msg of messages) {
      if (!msg.content.trim()) continue;
      messageLines.push(
        `    { role: "${msg.role}", content: ${escapeJSString(msg.content)} },`,
      );
    }

    const args: string[] = [];
    args.push(`  model: "${model}",`);
    args.push(`  max_tokens: ${maxTokens},`);
    args.push(`  messages: [`);
    args.push(messageLines.join('\n'));
    args.push(`  ],`);
    if (systemPrompt.trim()) {
      args.push(`  system: ${escapeJSString(systemPrompt)},`);
    }
    args.push(`  temperature: ${temperature},`);
    args.push(`  top_p: ${topP},`);
    if (stream) {
      args.push(`  stream: true,`);
    }

    if (stream) {
      return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const stream = client.messages.stream({
${args.join('\n')}
});

for await (const event of stream) {
  if (
    event.type === "content_block_delta" &&
    event.delta.type === "text_delta"
  ) {
    process.stdout.write(event.delta.text);
  }
}
`;
    }

    return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const message = await client.messages.create({
${args.join('\n')}
});

const content = message.content[0].text;
`;
  },
};
