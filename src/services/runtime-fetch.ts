import { isTauri } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export function shouldUseTauriHttpClient(): boolean {
  return !import.meta.env.DEV && isTauri();
}

export function runtimeFetch(
  input: URL | Request | string,
  init?: RequestInit,
): Promise<Response> {
  if (shouldUseTauriHttpClient()) {
    return tauriFetch(input, init);
  }

  return fetch(input, init);
}
