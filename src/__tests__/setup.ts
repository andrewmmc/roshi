import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

function createMemoryStorage(): Storage {
  const items = new Map<string, string>();

  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: window.localStorage ?? createMemoryStorage(),
});

// jsdom does not implement matchMedia — provide a minimal stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom does not implement ResizeObserver — provide a minimal stub
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom does not implement getAnimations — return no active animations
Object.defineProperty(Element.prototype, 'getAnimations', {
  configurable: true,
  writable: true,
  value: vi.fn(() => []),
});

afterEach(() => {
  localStorage.clear();
});
