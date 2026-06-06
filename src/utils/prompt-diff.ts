import type { HistoryEntry } from '@/types/history';

export function formatHistoryPrompt(entry: HistoryEntry): string {
  const lines: string[] = [];

  if (entry.request.systemPrompt?.trim()) {
    lines.push(`[system]\n${entry.request.systemPrompt.trim()}`);
  }

  for (const message of entry.request.messages) {
    lines.push(`[${message.role}]\n${message.content}`);
  }

  return lines.join('\n\n');
}
