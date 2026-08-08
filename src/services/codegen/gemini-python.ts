import type { CodeGenerator, CodeGenParams } from './types';
import { escapePythonString, getSendableMessages } from './shared';

export const geminiPythonGenerator: CodeGenerator = {
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
      frequencyPenalty,
      presencePenalty,
      stream = false,
    } = request;

    const contentLines: string[] = [];
    for (const msg of getSendableMessages(messages)) {
      if (msg.role === 'user') {
        contentLines.push(`    ${escapePythonString(msg.content)},`);
      } else {
        contentLines.push(
          `    types.Content(role="model", parts=[types.Part.from_text(text=${escapePythonString(msg.content)})]),`,
        );
      }
    }

    const configArgs: string[] = [];
    if (temperature !== undefined) {
      configArgs.push(`        temperature=${temperature},`);
    }
    if (maxTokens !== undefined) {
      configArgs.push(`        max_output_tokens=${maxTokens},`);
    }
    if (topP !== undefined) {
      configArgs.push(`        top_p=${topP},`);
    }
    if (topK !== undefined && topK > 0) {
      configArgs.push(`        top_k=${topK},`);
    }
    if (frequencyPenalty !== undefined) {
      configArgs.push(`        frequency_penalty=${frequencyPenalty},`);
    }
    if (presencePenalty !== undefined) {
      configArgs.push(`        presence_penalty=${presencePenalty},`);
    }

    const configBlock =
      configArgs.length > 0
        ? `    config=types.GenerateContentConfig(\n${configArgs.join('\n')}\n    ),`
        : null;

    const kwargs: string[] = [];
    kwargs.push(`    model="${model}",`);
    kwargs.push(`    contents=[`);
    kwargs.push(contentLines.join('\n'));
    kwargs.push(`    ],`);
    if (configBlock) {
      kwargs.push(configBlock);
    }
    if (systemPrompt.trim()) {
      kwargs.push(
        `    system_instruction=${escapePythonString(systemPrompt)},`,
      );
    }

    if (stream) {
      return `from google import genai
from google.genai import types

client = genai.Client()

for chunk in client.models.generate_content_stream(
${kwargs.join('\n')}
):
    print(chunk.text, end="", flush=True)
`;
    }

    return `from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
${kwargs.join('\n')}
)

content = response.text
`;
  },
};
