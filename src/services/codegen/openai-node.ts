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

export const openaiNodeGenerator: CodeGenerator = {
  label: 'Node.js',
  language: 'javascript',

  generate(params: CodeGenParams): string {
    const {
      provider,
      model,
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      stream,
    } = params;

    const isDefaultOpenAI = provider.baseUrl === 'https://api.openai.com/v1';
    const clientArgs: string[] = [];

    if (!isDefaultOpenAI) {
      clientArgs.push(`  baseURL: "${provider.baseUrl.replace(/\/$/, '')}",`);
    }

    if (provider.auth.type === 'api-key-header') {
      const headerName = provider.auth.headerName || 'x-api-key';
      clientArgs.push(
        `  defaultHeaders: { "${headerName}": process.env.API_KEY },`,
      );
    }

    const messageLines: string[] = [];
    if (systemPrompt.trim()) {
      messageLines.push(
        `    { role: "system", content: ${escapeJSString(systemPrompt)} },`,
      );
    }
    for (const msg of messages) {
      if (!msg.content.trim()) continue;
      messageLines.push(
        `    { role: "${msg.role}", content: ${escapeJSString(msg.content)} },`,
      );
    }

    const args: string[] = [];
    args.push(`  model: "${model}",`);
    args.push(`  temperature: ${temperature},`);
    args.push(`  max_tokens: ${maxTokens},`);
    args.push(`  top_p: ${topP},`);
    args.push(`  frequency_penalty: ${frequencyPenalty},`);
    args.push(`  presence_penalty: ${presencePenalty},`);
    args.push(`  messages: [`);
    args.push(messageLines.join('\n'));
    args.push(`  ],`);
    if (stream) {
      args.push(`  stream: true,`);
    }

    const clientArgsStr =
      clientArgs.length > 0 ? '\n' + clientArgs.join('\n') + '\n' : '';

    if (stream) {
      return `import OpenAI from "openai";

const client = new OpenAI({${clientArgsStr}});

const stream = await client.chat.completions.create({
${args.join('\n')}
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
`;
    }

    return `import OpenAI from "openai";

const client = new OpenAI({${clientArgsStr}});

const response = await client.chat.completions.create({
${args.join('\n')}
});

const content = response.choices[0].message.content;
`;
  },
};
