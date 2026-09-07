import { makeProvider } from '@/__tests__/fixtures';
import { redactExportData } from './export-redact';

describe('redactExportData', () => {
  it('scrubs encoded secrets, URL credentials, and configured query names', () => {
    const provider = makeProvider({
      apiKey: 'a b/c',
      auth: { type: 'query-param', headerName: 'tenant' },
    });
    const data = {
      requestUrl:
        'https://user:password@example.com/chat?tenant=private&region=us#section',
      endpoint: '/chat?%61pi_key=private',
      error: 'Rejected a%20b%2Fc',
      malformed: '/chat?%ZZ=public',
      empty: '',
      createdAt: new Date(),
      status: 200,
      response: null,
    };
    expect(redactExportData(data, [provider])).toEqual({
      ...data,
      requestUrl:
        'https://REDACTED@example.com/chat?tenant=REDACTED&region=us#section',
      endpoint: '/chat?%61pi_key=REDACTED',
      error: 'Rejected REDACTED',
    });
  });

  it('redacts additional runtime secrets', () => {
    expect(
      redactExportData(
        { request: 'token=runtime-secret', response: 'runtime-secret echoed' },
        [],
        ['runtime-secret'],
      ),
    ).toEqual({ request: 'token=REDACTED', response: 'REDACTED echoed' });
  });

  it('handles overlapping known keys and redacts raw payloads without changing their shape', () => {
    const providers = [
      makeProvider({ apiKey: 'short' }),
      makeProvider({ apiKey: 'short-long' }),
    ];
    expect(
      redactExportData(
        {
          chunks: [
            { content: 'short-long short', 'X-Api-Key': 'unknown-value' },
          ],
          apiKey: '',
        },
        providers,
      ),
    ).toEqual({
      chunks: [{ content: 'REDACTED REDACTED', 'X-Api-Key': 'REDACTED' }],
      apiKey: '',
    });
  });
});
