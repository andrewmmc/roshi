const EXTENSION_MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export const SUPPORTED_FILE_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/png,image/jpeg,image/gif,image/webp';

export function guessMimeType(filenameOrUrl: string): string {
  const path = filenameOrUrl.split('?')[0].split('#')[0];
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex === -1) return 'application/octet-stream';
  const ext = path.slice(dotIndex).toLowerCase();
  return EXTENSION_MIME_MAP[ext] ?? 'application/octet-stream';
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}
