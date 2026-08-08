import type { CodeGenerator, CodeGenParams } from './types';
import {
  buildAnthropicThinkingPythonKwargs,
  escapePythonString,
  getSendableMessages,
  anthropicRejectsSamplingParams,
} from './shared';

export const anthropicPythonGenerator: CodeGenerator = {
  label: 'Python',
  language: 'python',

  generate(params: CodeGenParams): string {
    const { request } = params;
    const {
      model,
      messages,
      systemPrompt = '',
      temperature,
      maxTokens,
      topP,
      topK,
      stream = false,
    } = request;

    const messageLines: string[] = [];
    for (const msg of getSendableMessages(messages)) {
      messageLines.push(
        `        {"role": "${msg.role}", "content": ${escapePythonString(msg.content)}},`,
      );
    }

    const kwargs: string[] = [];
    kwargs.push(`    model="${model}",`);
    // Anthropic requires max_tokens; fall back when the user left it optional.
    kwargs.push(`    max_tokens=${maxTokens ?? 4096},`);
    kwargs.push(`    messages=[`);
    kwargs.push(messageLines.join('\n'));
    kwargs.push(`    ],`);
    if (systemPrompt.trim()) {
      kwargs.push(`    system=${escapePythonString(systemPrompt)},`);
    }
    if (!anthropicRejectsSamplingParams(model)) {
      if (temperature !== undefined) {
        kwargs.push(`    temperature=${Math.min(temperature, 1)},`);
      } else if (topP !== undefined) {
        kwargs.push(`    top_p=${topP},`);
      }
      if (topK !== undefined && topK > 0) {
        kwargs.push(`    top_k=${topK},`);
      }
    }
    kwargs.push(...buildAnthropicThinkingPythonKwargs(request));
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
