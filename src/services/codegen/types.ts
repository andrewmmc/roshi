import type { ProviderConfig } from '@/types/provider';
import type { NormalizedRequest } from '@/types/normalized';

export interface CodeGenParams {
  provider: ProviderConfig;
  /** Capability-filtered request matching what the client sends on the wire. */
  request: NormalizedRequest;
  /** Composer/request-level headers merged over provider defaults. */
  customHeaders?: Record<string, string>;
}

export interface CodeGenerator {
  label: string;
  language: string;
  generate(params: CodeGenParams): string;
}
