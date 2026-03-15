import type { CodeGenerator, CodeGenParams } from './types';

function escapePythonString(s: string): string {
  if (s.includes('\n')) {
    return 'r"""' + s.replace(/"""/g, '""\\"') + '"""';
  }
  return (
    '"' +
    s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n') +
    '"'
  );
}

function mapRole(role: 'system' | 'user' | 'assistant'): 'user' | 'model' {
  return role === 'assistant' ? 'model' : 'user';
}

export const geminiPythonGenerator: CodeGenerator = {
  label: 'Python (Gemini SDK)',
  language: 'python',

  generate(params: CodeGenParams): string {
    const { model, messages, systemPrompt, temperature, maxTokens, stream } = params;
    const messageLines = messages
      .filter((m) => m.content.trim())
      .map(
        (m) =>
          `        types.Content(role="${mapRole(m.role)}", parts=[types.Part.from_text(text=${escapePythonString(m.content)})])`,
      );

    const configParts: string[] = [
      `temperature=${temperature}`,
      `max_output_tokens=${maxTokens}`,
    ];
    if (systemPrompt.trim()) {
      configParts.push(`system_instruction=${escapePythonString(systemPrompt)}`);
    }

    const sharedCall = `    model="${model}",
    contents=[
${messageLines.join(',\n')}
    ],
    config=types.GenerateContentConfig(${configParts.join(', ')}),`;

    if (stream) {
      return `import os

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

for chunk in client.models.generate_content_stream(
${sharedCall}
):
    if chunk.text:
        ...
`;
    }

    return `import os

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

response = client.models.generate_content(
${sharedCall}
)

content = response.text
`;
  },
};
