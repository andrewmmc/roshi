import type { CodeGenerator, CodeGenParams } from './types';
import {
  escapeJSString,
  getSendableMessages,
  mergeCodegenCustomHeaders,
  shouldGenerateOpenAIResponses,
} from './shared';

function buildClientArgs(
  provider: CodeGenParams['provider'],
  customHeaders?: Record<string, string>,
): string[] {
  const isDefaultOpenAI = provider.baseUrl === 'https://api.openai.com/v1';
  const clientArgs: string[] = [];

  if (!isDefaultOpenAI) {
    clientArgs.push(`  baseURL: "${provider.baseUrl.replace(/\/$/, '')}",`);
  }

  const mergedHeaders = mergeCodegenCustomHeaders(provider, customHeaders);
  if (provider.auth.type === 'api-key-header') {
    const headerName = provider.auth.headerName || 'x-api-key';
    mergedHeaders[headerName] = '__API_KEY__';
  }

  const headerEntries = Object.entries(mergedHeaders);
  if (headerEntries.length > 0) {
    clientArgs.push(`  defaultHeaders: {`);
    for (const [key, value] of headerEntries) {
      clientArgs.push(
        value === '__API_KEY__'
          ? `    "${key}": process.env.API_KEY,`
          : `    "${key}": ${escapeJSString(value)},`,
      );
    }
    clientArgs.push(`  },`);
  }

  return clientArgs;
}

function buildChatMessageLines(
  messages: CodeGenParams['request']['messages'],
  systemPrompt: string,
): string[] {
  const messageLines: string[] = [];
  if (systemPrompt.trim()) {
    messageLines.push(
      `    { role: "system", content: ${escapeJSString(systemPrompt)} },`,
    );
  }
  for (const msg of getSendableMessages(messages)) {
    messageLines.push(
      `    { role: "${msg.role}", content: ${escapeJSString(msg.content)} },`,
    );
  }
  return messageLines;
}

function buildResponsesInputLines(
  messages: CodeGenParams['request']['messages'],
): string[] {
  return getSendableMessages(messages).map(
    (msg) =>
      `    { role: "${msg.role}", content: ${escapeJSString(msg.content)} },`,
  );
}

function usesMaxCompletionTokens(model: string): boolean {
  return /^gpt-5(?:\.|-|$)/.test(model) || /^o\d(?:-|$)/.test(model);
}

export const openaiNodeGenerator: CodeGenerator = {
  label: 'Node.js',
  language: 'javascript',

  generate(params: CodeGenParams): string {
    const { provider, request, customHeaders } = params;
    const {
      model,
      messages,
      systemPrompt = '',
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      stream = false,
      effort,
      reasoningMode,
      verbosity,
    } = request;

    const clientArgs = buildClientArgs(provider, customHeaders);
    const isResponses = shouldGenerateOpenAIResponses(provider, model);

    const args: string[] = [];
    args.push(`  model: "${model}",`);
    if (isResponses) {
      if (systemPrompt.trim()) {
        args.push(`  instructions: ${escapeJSString(systemPrompt)},`);
      }
      if (temperature !== undefined) {
        args.push(`  temperature: ${temperature},`);
      }
      if (maxTokens !== undefined) {
        args.push(`  max_output_tokens: ${maxTokens},`);
      }
      if (topP !== undefined) {
        args.push(`  top_p: ${topP},`);
      }
      args.push(`  input: [`);
      args.push(buildResponsesInputLines(messages).join('\n'));
      args.push(`  ],`);
      const reasoning: string[] = [];
      if (effort) reasoning.push(`effort: "${effort}"`);
      if (reasoningMode) reasoning.push(`mode: "${reasoningMode}"`);
      if (reasoning.length > 0) {
        args.push(`  reasoning: { ${reasoning.join(', ')} },`);
      }
      if (verbosity) {
        args.push(`  text: { verbosity: "${verbosity}" },`);
      }
    } else {
      if (temperature !== undefined) {
        args.push(`  temperature: ${temperature},`);
      }
      if (maxTokens !== undefined) {
        args.push(
          `  ${usesMaxCompletionTokens(model) ? 'max_completion_tokens' : 'max_tokens'}: ${maxTokens},`,
        );
      }
      if (topP !== undefined) {
        args.push(`  top_p: ${topP},`);
      }
      if (frequencyPenalty !== undefined) {
        args.push(`  frequency_penalty: ${frequencyPenalty},`);
      }
      if (presencePenalty !== undefined) {
        args.push(`  presence_penalty: ${presencePenalty},`);
      }
      args.push(`  messages: [`);
      args.push(buildChatMessageLines(messages, systemPrompt).join('\n'));
      args.push(`  ],`);
    }
    if (stream) {
      args.push(`  stream: true,`);
      if (!isResponses) {
        args.push(`  stream_options: { include_usage: true },`);
      }
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
