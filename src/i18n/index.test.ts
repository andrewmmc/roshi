import { translate } from '@/i18n';
import { localeCatalogs } from '@/i18n/locales';

describe('translate', () => {
  it('returns localized messages', () => {
    expect(translate('en', 'settings.title')).toBe('Settings');
    expect(translate('zh-TW', 'settings.title')).toBe('設定');
  });

  it('interpolates variables', () => {
    expect(translate('zh-TW', 'response.tokens', { count: 12 })).toBe(
      '12 個 token',
    );
  });

  it('keeps every locale aligned to the English namespace contract', () => {
    const expectedNamespaces = Object.keys(localeCatalogs.en);

    for (const catalog of Object.values(localeCatalogs)) {
      expect(Object.keys(catalog)).toEqual(expectedNamespaces);
      for (const namespace of expectedNamespaces) {
        expect(Object.keys(catalog[namespace as keyof typeof catalog])).toEqual(
          Object.keys(
            localeCatalogs.en[namespace as keyof typeof localeCatalogs.en],
          ),
        );
      }
    }
  });
});
