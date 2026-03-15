import type { CodeGenerator, CodeGenParams } from './types';

function escapeJSString(s: string): string {
  if (s.includes('\n')) {
    return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
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

export const geminiNodeGenerator: CodeGenerator = {
  label: 'Node.js (Gemini SDK)',
  language: 'javascript',

  generate(params: CodeGenParams): string {
    const { model, messages, systemPrompt, temperature, maxTokens, stream } = params;

    const contentLines = messages
      .filter((m) => m.content.trim())
      .map(
        (m) =>
          `    { role: "${mapRole(m.role)}", parts: [{ text: ${escapeJSString(m.content)} }] }`,
      );

    const configLines: string[] = [
      `    temperature: ${temperature},`,
      `    maxOutputTokens: ${maxTokens},`,
    ];
    if (systemPrompt.trim()) {
      configLines.push(`    systemInstruction: ${escapeJSString(systemPrompt)},`);
    }

    const sharedArgs = `  model: "${model}",
  contents: [
${contentLines.join(',\n')}
  ],
  config: {
${configLines.join('\n')}
  },`;

    if (stream) {
      return `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const stream = await ai.models.generateContentStream({
${sharedArgs}
});

for await (const chunk of stream) {
  if (chunk.text) {
    // ...
  }
}
`;
    }

    return `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
${sharedArgs}
});

const content = response.text;
`;
  },
};
