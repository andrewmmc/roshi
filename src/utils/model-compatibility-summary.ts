import type { ModelCapabilities } from '@/models/capabilities';

export interface CompatibilitySummaryItem {
  label: string;
  value: string;
  supported: boolean;
}

function formatTokenLimit(value: number | undefined): string {
  if (value === undefined) return 'Unknown';
  return value.toLocaleString();
}

export function buildModelCompatibilitySummary(
  capabilities: ModelCapabilities | null,
): CompatibilitySummaryItem[] {
  if (!capabilities) {
    return [
      { label: 'Streaming', value: 'Unknown', supported: true },
      { label: 'Images', value: 'Unknown', supported: true },
      { label: 'Thinking', value: 'Unknown', supported: true },
      { label: 'Context', value: 'Unknown', supported: true },
      { label: 'Max output', value: 'Unknown', supported: true },
    ];
  }

  const supportsImages = capabilities.inputModalities.includes('image');
  const supportsThinking = Boolean(capabilities.params.thinking);

  return [
    {
      label: 'Streaming',
      value: capabilities.streaming ? 'Supported' : 'Not supported',
      supported: capabilities.streaming,
    },
    {
      label: 'Images',
      value: supportsImages ? 'Supported' : 'Not supported',
      supported: supportsImages,
    },
    {
      label: 'Thinking',
      value: supportsThinking ? 'Supported' : 'Not supported',
      supported: supportsThinking,
    },
    {
      label: 'Context',
      value: formatTokenLimit(capabilities.tokenLimits?.context),
      supported: true,
    },
    {
      label: 'Max output',
      value: formatTokenLimit(capabilities.tokenLimits?.output),
      supported: true,
    },
  ];
}
