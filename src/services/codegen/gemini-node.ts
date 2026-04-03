import type { CodeGenerator, CodeGenParams } from './types';

function escapeJSString(s: string): string {
  if (s.includes('\n')) {
    return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
  }
  return (
    '"' +
    s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') +
    '"'
  );
}

export const geminiNodeGenerator: CodeGenerator = {
  label: 'Node.js',
  language: 'javascript',

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
        contentLines.push(`    ${escapeJSString(msg.content)},`);
      } else {
        contentLines.push(
          `    { role: "model", parts: [{ text: ${escapeJSString(msg.content)} }] },`,
        );
      }
    }

    const configArgs: string[] = [];
    configArgs.push(`      temperature: ${temperature},`);
    configArgs.push(`      maxOutputTokens: ${maxTokens},`);
    configArgs.push(`      topP: ${topP},`);
    configArgs.push(`      frequencyPenalty: ${frequencyPenalty},`);
    configArgs.push(`      presencePenalty: ${presencePenalty},`);

    let systemLine = '';
    if (systemPrompt.trim()) {
      systemLine = `\n    systemInstruction: ${escapeJSString(systemPrompt)},`;
    }

    const args: string[] = [];
    args.push(`    model: "${model}",`);
    args.push(`    contents: [`);
    args.push(contentLines.join('\n'));
    args.push(`    ],`);
    args.push(`    config: {`);
    args.push(configArgs.join('\n'));
    args.push(`    },`);

    if (stream) {
      return `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContentStream({
${args.join('\n')}${systemLine}
});

for await (const chunk of response) {
  process.stdout.write(chunk.text ?? "");
}
`;
    }

    return `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
${args.join('\n')}${systemLine}
});

const content = response.text;
`;
  },
};
