import { translate } from '@/i18n';

describe('translate', () => {
  it('returns localized messages', () => {
    expect(translate('en', 'settings')).toBe('Settings');
    expect(translate('zh-TW', 'settings')).toBe('設定');
  });

  it('interpolates variables', () => {
    expect(translate('zh-TW', 'tokens', { count: 12 })).toBe('12 個 token');
  });
});
