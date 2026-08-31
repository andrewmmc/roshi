import type { MessageKey } from '@/i18n/types';
import type { ModelCapabilities } from '@/models/capabilities';

export interface CompatibilitySummaryItem {
  labelKey: MessageKey;
  /** Translation key for the value, when the value is a fixed message. */
  valueKey: MessageKey | null;
  /** Raw value (e.g. a formatted token count) when valueKey is null. */
  value: string | null;
  supported: boolean;
}

function formatTokenLimit(
  value: number | undefined,
  formatNumber: (value: number) => string,
): string | null {
  if (value === undefined) return null;
  return formatNumber(value);
}

export function buildModelCompatibilitySummary(
  capabilities: ModelCapabilities | null,
  formatNumber: (value: number) => string,
): CompatibilitySummaryItem[] {
  if (!capabilities) {
    return [
      {
        labelKey: 'request.paramLabelStream',
        valueKey: 'common.unknown',
        value: null,
        supported: true,
      },
      {
        labelKey: 'request.paramLabelImages',
        valueKey: 'common.unknown',
        value: null,
        supported: true,
      },
      {
        labelKey: 'request.thinking',
        valueKey: 'common.unknown',
        value: null,
        supported: true,
      },
      {
        labelKey: 'request.paramLabelContext',
        valueKey: 'common.unknown',
        value: null,
        supported: true,
      },
      {
        labelKey: 'request.paramLabelMaxOutput',
        valueKey: 'common.unknown',
        value: null,
        supported: true,
      },
    ];
  }

  const supportsImages = capabilities.inputModalities.includes('image');
  const supportsThinking = Boolean(capabilities.params.thinking);

  return [
    {
      labelKey: 'request.paramLabelStream',
      valueKey: capabilities.streaming
        ? 'request.supported'
        : 'request.notSupported',
      value: null,
      supported: capabilities.streaming,
    },
    {
      labelKey: 'request.paramLabelImages',
      valueKey: supportsImages ? 'request.supported' : 'request.notSupported',
      value: null,
      supported: supportsImages,
    },
    {
      labelKey: 'request.thinking',
      valueKey: supportsThinking ? 'request.supported' : 'request.notSupported',
      value: null,
      supported: supportsThinking,
    },
    {
      labelKey: 'request.paramLabelContext',
      valueKey: null,
      value: formatTokenLimit(capabilities.tokenLimits?.context, formatNumber),
      supported: true,
    },
    {
      labelKey: 'request.paramLabelMaxOutput',
      valueKey: null,
      value: formatTokenLimit(capabilities.tokenLimits?.output, formatNumber),
      supported: true,
    },
  ];
}
