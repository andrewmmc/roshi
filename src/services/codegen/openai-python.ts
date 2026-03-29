import type { CodeGenerator, CodeGenParams } from './types';

function escapePythonString(s: string): string {
  if (s.includes('\n')) {
    return 'r"""' + s.replace(/"""/g, '""\\"') + '"""';
  }
  return (
    '"' +
    s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') +
    '"'
  );
}

export const openaiPythonGenerator: CodeGenerator = {
  label: 'Python (OpenAI SDK)',
  language: 'python',

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
      clientArgs.push(`    base_url="${provider.baseUrl.replace(/\/$/, '')}"`);
    }

    if (provider.auth.type === 'api-key-header') {
      const headerName = provider.auth.headerName || 'x-api-key';
      clientArgs.push(
        `    default_headers={"${headerName}": os.environ.get("API_KEY")}`,
      );
    }

    const messageLines: string[] = [];
    if (systemPrompt.trim()) {
      messageLines.push(
        `        {"role": "system", "content": ${escapePythonString(systemPrompt)}},`,
      );
    }
    for (const msg of messages) {
      if (!msg.content.trim()) continue;
      messageLines.push(
        `        {"role": "${msg.role}", "content": ${escapePythonString(msg.content)}},`,
      );
    }

    const kwargs: string[] = [];
    kwargs.push(`    model="${model}",`);
    kwargs.push(`    temperature=${temperature},`);
    kwargs.push(`    max_tokens=${maxTokens},`);
    kwargs.push(`    top_p=${topP},`);
    kwargs.push(`    frequency_penalty=${frequencyPenalty},`);
    kwargs.push(`    presence_penalty=${presencePenalty},`);
    kwargs.push(`    messages=[`);
    kwargs.push(messageLines.join('\n'));
    kwargs.push(`    ],`);
    if (stream) {
      kwargs.push(`    stream=True,`);
    }

    const needsOs = provider.auth.type === 'api-key-header';
    const importLine = needsOs
      ? 'import os\n\nfrom openai import OpenAI'
      : 'from openai import OpenAI';

    const clientArgsStr =
      clientArgs.length > 0 ? '\n' + clientArgs.join(',\n') + '\n' : '';

    if (stream) {
      return `${importLine}\n\nclient = OpenAI(${clientArgsStr})\n\nstream = client.chat.completions.create(\n${kwargs.join('\n')}\n)\n\nfor chunk in stream:\n    content = chunk.choices[0].delta.content\n    if content is not None:\n        ...\n`;
    }

    return `${importLine}\n\nclient = OpenAI(${clientArgsStr})\n\nresponse = client.chat.completions.create(\n${kwargs.join('\n')}\n)\n\ncontent = response.choices[0].message.content\n`;
  },
};
