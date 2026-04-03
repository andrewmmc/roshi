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

export const anthropicPythonGenerator: CodeGenerator = {
  label: 'Python',
  language: 'python',

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
        `        {"role": "${msg.role}", "content": ${escapePythonString(msg.content)}},`,
      );
    }

    const kwargs: string[] = [];
    kwargs.push(`    model="${model}",`);
    kwargs.push(`    max_tokens=${maxTokens},`);
    kwargs.push(`    messages=[`);
    kwargs.push(messageLines.join('\n'));
    kwargs.push(`    ],`);
    if (systemPrompt.trim()) {
      kwargs.push(`    system=${escapePythonString(systemPrompt)},`);
    }
    kwargs.push(`    temperature=${temperature},`);
    kwargs.push(`    top_p=${topP},`);
    if (stream) {
      kwargs.push(`    stream=True,`);
    }

    if (stream) {
      return `import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
${kwargs.join('\n')}
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
`;
    }

    return `import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
${kwargs.join('\n')}
)

content = message.content[0].text
`;
  },
};
