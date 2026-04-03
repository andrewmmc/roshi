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

export const geminiPythonGenerator: CodeGenerator = {
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
      frequencyPenalty,
      presencePenalty,
      stream,
    } = params;

    const contentLines: string[] = [];
    for (const msg of messages) {
      if (!msg.content.trim()) continue;
      if (msg.role === 'user') {
        contentLines.push(`    ${escapePythonString(msg.content)},`);
      } else {
        contentLines.push(
          `    types.Content(role="model", parts=[types.Part.from_text(text=${escapePythonString(msg.content)})]),`,
        );
      }
    }

    const configArgs: string[] = [];
    configArgs.push(`        temperature=${temperature},`);
    configArgs.push(`        max_output_tokens=${maxTokens},`);
    configArgs.push(`        top_p=${topP},`);
    configArgs.push(`        frequency_penalty=${frequencyPenalty},`);
    configArgs.push(`        presence_penalty=${presencePenalty},`);

    const configBlock = `    config=types.GenerateContentConfig(\n${configArgs.join('\n')}\n    ),`;

    const kwargs: string[] = [];
    kwargs.push(`    model="${model}",`);
    kwargs.push(`    contents=[`);
    kwargs.push(contentLines.join('\n'));
    kwargs.push(`    ],`);
    kwargs.push(configBlock);
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
