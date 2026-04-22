import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { vi } from 'vitest';

import { App } from './app';
import { store } from './store';

vi.mock('@gravity-ui/uikit', () => ({
  Icon: () => null,
  Tab: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  TabList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ThemeProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@gravity-ui/icons', () => ({
  ArrowShapeDownToLine: {},
  Heart: {},
  MusicNote: {},
}));

vi.mock('./components', () => ({
  Likes: () => <div>Likes Panel</div>,
}));

vi.mock('./components/download/download.tsx', () => ({
  Download: () => <div>Download Panel</div>,
}));

vi.mock('./api/api.slice', () => ({
  apiSlice: {
    reducerPath: 'api',
    reducer: () => ({}),
    middleware: () => (next: (action: unknown) => unknown) => (action: unknown) => next(action),
  },
  useGetFavoritesQuery: () => ({ data: [] }),
}));

describe('App', () => {
  it('renders the main tabs', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    expect(screen.getByText('Likes')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Likes Panel')).toBeInTheDocument();
    expect(screen.getByText('Download Panel')).toBeInTheDocument();
  });
});
