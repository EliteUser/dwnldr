import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { App } from './app';

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
  Gear: {},
  Heart: {},
  MusicNote: {},
}));

vi.mock('./components', () => ({
  Download: () => <div>Download Panel</div>,
  Likes: () => <div>Likes Panel</div>,
  Settings: () => <div>Settings Panel</div>,
}));

vi.mock('./api/api', () => ({
  useGetFavoritesQuery: () => ({ data: [] }),
}));

describe('App', () => {
  it('renders the main tabs', () => {
    render(<App />);

    expect(screen.getByText('Likes')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Likes Panel')).toBeInTheDocument();
    expect(screen.getByText('Download Panel')).toBeInTheDocument();
    expect(screen.getByText('Settings Panel')).toBeInTheDocument();
  });
});
