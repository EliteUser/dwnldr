import type * as MantineNotifications from '@mantine/notifications';
import { afterEach, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

// Notifications are a side effect worth asserting on; the rest of Mantine renders for real.
vi.mock('@mantine/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof MantineNotifications>()),
  notifications: { clean: vi.fn(), hide: vi.fn(), show: vi.fn(), update: vi.fn() },
}));

// jsdom lacks these browser APIs, which Mantine and the artwork preview use.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLElement.prototype.scrollIntoView = () => undefined;
Object.defineProperty(document, 'fonts', {
  value: { addEventListener: () => undefined, removeEventListener: () => undefined },
});
URL.createObjectURL = () => 'blob:test';
URL.revokeObjectURL = () => undefined;

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});
