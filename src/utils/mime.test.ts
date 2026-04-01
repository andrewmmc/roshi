import { guessMimeType, isImageMimeType, SUPPORTED_FILE_ACCEPT } from './mime';

describe('guessMimeType', () => {
  it.each([
    ['photo.png', 'image/png'],
    ['photo.PNG', 'image/png'],
    ['image.jpg', 'image/jpeg'],
    ['image.jpeg', 'image/jpeg'],
    ['animation.gif', 'image/gif'],
    ['image.webp', 'image/webp'],
    ['document.pdf', 'application/pdf'],
  ])('returns correct MIME for %s', (filename, expected) => {
    expect(guessMimeType(filename)).toBe(expected);
  });

  it('strips query params and fragments from URLs', () => {
    expect(guessMimeType('https://cdn.example.com/img.png?w=200')).toBe(
      'image/png',
    );
    expect(guessMimeType('https://cdn.example.com/img.jpg#section')).toBe(
      'image/jpeg',
    );
  });

  it('returns octet-stream for unknown extensions', () => {
    expect(guessMimeType('file.xyz')).toBe('application/octet-stream');
  });

  it('returns octet-stream when no extension is present', () => {
    expect(guessMimeType('noextension')).toBe('application/octet-stream');
    expect(guessMimeType('https://example.com/blob')).toBe(
      'application/octet-stream',
    );
  });
});

describe('isImageMimeType', () => {
  it('returns true for image types', () => {
    expect(isImageMimeType('image/png')).toBe(true);
    expect(isImageMimeType('image/jpeg')).toBe(true);
    expect(isImageMimeType('image/gif')).toBe(true);
    expect(isImageMimeType('image/webp')).toBe(true);
  });

  it('returns false for non-image types', () => {
    expect(isImageMimeType('application/pdf')).toBe(false);
    expect(isImageMimeType('application/octet-stream')).toBe(false);
  });
});

describe('SUPPORTED_FILE_ACCEPT', () => {
  it('includes PDF and image extensions', () => {
    expect(SUPPORTED_FILE_ACCEPT).toContain('.pdf');
    expect(SUPPORTED_FILE_ACCEPT).toContain('.png');
    expect(SUPPORTED_FILE_ACCEPT).toContain('.jpg');
    expect(SUPPORTED_FILE_ACCEPT).toContain('.jpeg');
    expect(SUPPORTED_FILE_ACCEPT).toContain('.gif');
    expect(SUPPORTED_FILE_ACCEPT).toContain('.webp');
  });
});
