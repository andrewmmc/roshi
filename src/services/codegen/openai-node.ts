import type { CodeGenerator, CodeGenParams } from './types';
import {
  escapeJSString,
  getSendableMessages,
  shouldGenerateOpenAIResponses,
} from './shared';

function buildClientArgs(provider: CodeGenParams['provider']): string[] {
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

  return clientArgs;
}

function buildChatMessageLines(params: CodeGenParams): string[] {
  const messageLines: string[] = [];
  if (params.systemPrompt.trim()) {
    messageLines.push(
      `    { role: "system", content: ${escapeJSString(params.systemPrompt)} },`,
    );
  }
  for (const msg of getSendableMessages(params.messages)) {
    messageLines.push(
      `    { role: "${msg.role}", content: ${escapeJSString(msg.content)} },`,
    );
  }
  return messageLines;
}

function buildResponsesInputLines(params: CodeGenParams): string[] {
  return getSendableMessages(params.messages).map(
    (msg) =>
      `    { role: "${msg.role}", content: ${escapeJSString(msg.content)} },`,
  );
}

export const openaiNodeGenerator: CodeGenerator = {
  label: 'Node.js',
  language: 'javascript',

  generate(params: CodeGenParams): string {
    const {
      provider,
      model,
      systemPrompt,
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      stream,
    } = params;

    const clientArgs = buildClientArgs(provider);
    const isResponses = shouldGenerateOpenAIResponses(provider, model);

    const args: string[] = [];
    args.push(`  model: "${model}",`);
    if (isResponses) {
      if (systemPrompt.trim()) {
        args.push(`  instructions: ${escapeJSString(systemPrompt)},`);
      }
      args.push(`  max_output_tokens: ${maxTokens},`);
      args.push(`  input: [`);
      args.push(buildResponsesInputLines(params).join('\n'));
      args.push(`  ],`);
      if (params.effort) {
        args.push(`  reasoning: { effort: "${params.effort}" },`);
      }
      if (params.verbosity) {
        args.push(`  text: { verbosity: "${params.verbosity}" },`);
      }
    } else {
      args.push(`  temperature: ${temperature},`);
      args.push(`  max_tokens: ${maxTokens},`);
      args.push(`  top_p: ${topP},`);
      args.push(`  frequency_penalty: ${frequencyPenalty},`);
      args.push(`  presence_penalty: ${presencePenalty},`);
      args.push(`  messages: [`);
      args.push(buildChatMessageLines(params).join('\n'));
      args.push(`  ],`);
    }
    if (stream) {
      args.push(`  stream: true,`);
    }

    const clientArgsStr =
      clientArgs.length > 0 ? '\n' + clientArgs.join('\n') + '\n' : '';

    if (isResponses && stream) {
      return `import OpenAI from "openai";

const client = new OpenAI({${clientArgsStr}});

const stream = await client.responses.create({
${args.join('\n')}
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
  }
}
`;
    }

    if (isResponses) {
      return `import OpenAI from "openai";

const client = new OpenAI({${clientArgsStr}});

const response = await client.responses.create({
${args.join('\n')}
});

const content = response.output_text;
`;
    }

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
