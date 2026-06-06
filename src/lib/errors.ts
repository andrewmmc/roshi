export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
  }
}

export function toErrorMessage(
  error: unknown,
  fallback = 'Unknown error',
): string {
  if (error instanceof AppError || error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}
