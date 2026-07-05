import type { CodeGenerator, CodeGenParams } from './types';
import {
  buildAnthropicThinkingArgs,
  escapeJSString,
  getSendableMessages,
  isOpus47OrNewer,
  mergeCodegenCustomHeaders,
} from './shared';

export const anthropicNodeGenerator: CodeGenerator = {
  label: 'Node.js',
  language: 'javascript',

  generate(params: CodeGenParams): string {
    const { provider, request, customHeaders } = params;
    const {
      model,
      messages,
      systemPrompt = '',
      temperature = 1,
      maxTokens = 4096,
      topP = 1,
      topK,
      stream = false,
    } = request;

    const messageLines: string[] = [];
    for (const msg of getSendableMessages(messages)) {
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
    if (!isOpus47OrNewer(model)) {
      args.push(`  temperature: ${temperature},`);
      args.push(`  top_p: ${topP},`);
      if (topK !== undefined && topK > 0) {
        args.push(`  top_k: ${topK},`);
      }
    }
    args.push(...buildAnthropicThinkingArgs(request));
    if (stream) {
      args.push(`  stream: true,`);
    }

    const mergedHeaders = mergeCodegenCustomHeaders(provider, customHeaders);
    const headerBlock =
      Object.keys(mergedHeaders).length > 0
        ? `\n  defaultHeaders: {\n${Object.entries(mergedHeaders)
            .map(([key, value]) => `    "${key}": ${escapeJSString(value)},`)
            .join('\n')}\n  },`
        : '';

    if (stream) {
      return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({${headerBlock}
});

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

const client = new Anthropic({${headerBlock}
});

const message = await client.messages.create({
${args.join('\n')}
});

const content = message.content[0].text;
`;
  },
};
