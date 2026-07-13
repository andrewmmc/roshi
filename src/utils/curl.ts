function shellEscapeSingleQuote(value: string): string {
  // Replace ' with '\'' (end quote, escaped single quote, reopen quote)
  return value.replace(/'/g, "'\\''");
}

export function buildCurlCommand({
  url,
  headers,
  body,
  bodyJson,
}: {
  url: string | null;
  headers: Record<string, string> | null;
  body: Record<string, unknown> | null;
  bodyJson?: string | null;
}): string | null {
  if (!url) return null;

  const lines: string[] = [`curl -X POST '${shellEscapeSingleQuote(url)}'`];

  if (headers) {
    for (const [name, value] of Object.entries(headers)) {
      lines.push(
        `  -H '${shellEscapeSingleQuote(name)}: ${shellEscapeSingleQuote(value)}'`,
      );
    }
  }

  if (body) {
    const bodyStr = bodyJson ?? JSON.stringify(body, null, 2);
    lines.push(`  -d '${shellEscapeSingleQuote(bodyStr)}'`);
  }

  return lines.join(' \\\n');
}
