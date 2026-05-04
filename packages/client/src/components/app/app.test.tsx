import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { App } from './app';

vi.mock('../index', () => ({
  Download: () => <div>Download Panel</div>,
  Likes: () => <div>Likes Panel</div>,
  Settings: () => <div>Settings Panel</div>,
  TrackMeta: () => <div>Meta Panel</div>,
}));

vi.mock('./api/api', () => ({
  useGetFavoritesQuery: () => ({ data: [] }),
}));

describe('App', () => {
  it('renders the main tabs', () => {
    render(<App />);

    expect(screen.getByText('Likes')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Meta')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Likes Panel')).toBeInTheDocument();
    expect(screen.getByText('Download Panel')).toBeInTheDocument();
    expect(screen.getByText('Meta Panel')).toBeInTheDocument();
    expect(screen.getByText('Settings Panel')).toBeInTheDocument();
  });
});
