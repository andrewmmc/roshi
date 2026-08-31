import { countWords, translate } from '@/i18n';
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

  it('keeps interpolation variables aligned across locales', () => {
    const variablesIn = (message: string) =>
      [...message.matchAll(/\{([a-zA-Z]\w*)\}/g)]
        .map((match) => match[1])
        .sort();

    for (const [namespace, englishMessages] of Object.entries(
      localeCatalogs.en,
    )) {
      for (const [key, englishMessage] of Object.entries(englishMessages)) {
        for (const catalog of Object.values(localeCatalogs)) {
          expect(
            variablesIn(
              catalog[namespace as keyof typeof catalog][
                key as keyof (typeof catalog)[keyof typeof catalog]
              ],
            ),
          ).toEqual(variablesIn(englishMessage));
        }
      }
    }
  });
});

describe('countWords', () => {
  it('counts words according to the active locale', () => {
    expect(countWords('en', 'Hello, world!')).toBe(2);
    expect(countWords('zh-TW', '這是一段中文回應。')).toBe(4);
  });
});
