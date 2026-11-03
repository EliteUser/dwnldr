import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { vi } from 'vitest';

/** Renders with the app's providers; `rerender` keeps them. */
export const renderWithProviders = (ui: ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper });
};

/** Drops files onto a Mantine Dropzone, which reads them from its hidden file input. */
export const dropFiles = (container: HTMLElement, files: File[]) => {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');

  if (!input) {
    throw new Error('No file input found.');
  }

  fireEvent.change(input, { target: { files } });
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** Stubs fetch with a handler keyed by request path; unknown paths answer 404. */
export const mockApi = (routes: Record<string, FetchHandler>) => {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const handler = routes[new URL(url, 'http://localhost').pathname];

    return handler ? handler(url, init) : jsonResponse({ code: 'NOT_FOUND', error: 'Not found' }, 404);
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
};
