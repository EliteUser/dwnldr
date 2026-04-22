import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'alert', {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: () => 'blob:test',
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: () => undefined,
});
