import type { CodeGenerator, CodeGenParams } from './types';
import {
  escapePythonString,
  getSendableMessages,
  shouldGenerateOpenAIResponses,
} from './shared';

function buildClientArgs(provider: CodeGenParams['provider']): string[] {
  const isDefaultOpenAI = provider.baseUrl === 'https://api.openai.com/v1';
  const clientArgs: string[] = [];

  if (!isDefaultOpenAI) {
    clientArgs.push(`    base_url="${provider.baseUrl.replace(/\/$/, '')}"`);
  }

  if (provider.auth.type === 'api-key-header') {
    const headerName = provider.auth.headerName || 'x-api-key';
    clientArgs.push(
      `    default_headers={"${headerName}": os.environ.get("API_KEY")}`,
    );
  }

  return clientArgs;
}

function buildChatMessageLines(params: CodeGenParams): string[] {
  const messageLines: string[] = [];
  if (params.systemPrompt.trim()) {
    messageLines.push(
      `        {"role": "system", "content": ${escapePythonString(params.systemPrompt)}},`,
    );
  }
  for (const msg of getSendableMessages(params.messages)) {
    messageLines.push(
      `        {"role": "${msg.role}", "content": ${escapePythonString(msg.content)}},`,
    );
  }
  return messageLines;
}

function buildResponsesInputLines(params: CodeGenParams): string[] {
  return getSendableMessages(params.messages).map(
    (msg) =>
      `        {"role": "${msg.role}", "content": ${escapePythonString(msg.content)}},`,
  );
}

export const openaiPythonGenerator: CodeGenerator = {
  label: 'Python',
  language: 'python',

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

    const kwargs: string[] = [];
    kwargs.push(`    model="${model}",`);
    if (isResponses) {
      if (systemPrompt.trim()) {
        kwargs.push(`    instructions=${escapePythonString(systemPrompt)},`);
      }
      kwargs.push(`    max_output_tokens=${maxTokens},`);
      kwargs.push(`    input=[`);
      kwargs.push(buildResponsesInputLines(params).join('\n'));
      kwargs.push(`    ],`);
      if (params.effort) {
        kwargs.push(`    reasoning={"effort": "${params.effort}"},`);
      }
      if (params.verbosity) {
        kwargs.push(`    text={"verbosity": "${params.verbosity}"},`);
      }
    } else {
      kwargs.push(`    temperature=${temperature},`);
      kwargs.push(`    max_tokens=${maxTokens},`);
      kwargs.push(`    top_p=${topP},`);
      kwargs.push(`    frequency_penalty=${frequencyPenalty},`);
      kwargs.push(`    presence_penalty=${presencePenalty},`);
      kwargs.push(`    messages=[`);
      kwargs.push(buildChatMessageLines(params).join('\n'));
      kwargs.push(`    ],`);
    }
    if (stream) {
      kwargs.push(`    stream=True,`);
    }

    const needsOs = provider.auth.type === 'api-key-header';
    const importLine = needsOs
      ? 'import os\n\nfrom openai import OpenAI'
      : 'from openai import OpenAI';

    const clientArgsStr =
      clientArgs.length > 0 ? '\n' + clientArgs.join(',\n') + '\n' : '';

    if (isResponses && stream) {
      return `${importLine}\n\nclient = OpenAI(${clientArgsStr})\n\nstream = client.responses.create(\n${kwargs.join('\n')}\n)\n\nfor event in stream:\n    if event.type == "response.output_text.delta":\n        print(event.delta, end="", flush=True)\n`;
    }

    if (isResponses) {
      return `${importLine}\n\nclient = OpenAI(${clientArgsStr})\n\nresponse = client.responses.create(\n${kwargs.join('\n')}\n)\n\ncontent = response.output_text\n`;
    }

    if (stream) {
      return `${importLine}\n\nclient = OpenAI(${clientArgsStr})\n\nstream = client.chat.completions.create(\n${kwargs.join('\n')}\n)\n\nfor chunk in stream:\n    content = chunk.choices[0].delta.content\n    if content is not None:\n        print(content, end="", flush=True)\n`;
    }

    return `${importLine}\n\nclient = OpenAI(${clientArgsStr})\n\nresponse = client.chat.completions.create(\n${kwargs.join('\n')}\n)\n\ncontent = response.choices[0].message.content\n`;
  },
};
