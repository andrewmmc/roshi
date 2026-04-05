import { buildCurlCommand } from './curl';

describe('buildCurlCommand', () => {
  it('returns null when url is missing', () => {
    expect(
      buildCurlCommand({ url: null, headers: null, body: null }),
    ).toBeNull();
  });

  it('builds a basic curl command with url only', () => {
    const result = buildCurlCommand({
      url: 'https://api.openai.com/v1/chat/completions',
      headers: null,
      body: null,
    });
    expect(result).toBe(
      "curl -X POST 'https://api.openai.com/v1/chat/completions'",
    );
  });

  it('includes headers', () => {
    const result = buildCurlCommand({
      url: 'https://api.example.com',
      headers: {
        Authorization: 'Bearer sk-abc',
        'Content-Type': 'application/json',
      },
      body: null,
    });
    expect(result).toContain("-H 'Authorization: Bearer sk-abc'");
    expect(result).toContain("-H 'Content-Type: application/json'");
  });

  it('includes body as formatted JSON', () => {
    const result = buildCurlCommand({
      url: 'https://api.example.com',
      headers: null,
      body: { model: 'gpt-4', messages: [] },
    });
    expect(result).toContain('-d ');
    expect(result).toContain('"model": "gpt-4"');
  });

  it('shell-escapes single quotes in header values', () => {
    const result = buildCurlCommand({
      url: 'https://api.example.com',
      headers: { 'X-Custom': "it's a value" },
      body: null,
    });
    expect(result).toContain("-H 'X-Custom: it'\\''s a value'");
  });

  it('shell-escapes single quotes in the url', () => {
    const result = buildCurlCommand({
      url: "https://api.example.com/path?q=it's",
      headers: null,
      body: null,
    });
    expect(result).toContain(
      "curl -X POST 'https://api.example.com/path?q=it'\\''s'",
    );
  });

  it('shell-escapes single quotes in body values', () => {
    const result = buildCurlCommand({
      url: 'https://api.example.com',
      headers: null,
      body: { message: "don't" },
    });
    expect(result).toContain("\\'");
  });
});
