import { notifications } from '@mantine/notifications';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';

vi.mock('../index', () => ({
  Download: ({ selectedUrl }: { selectedUrl?: string }) => <div data-testid='download-panel'>{selectedUrl}</div>,
  Likes: () => <div>Likes Panel</div>,
  Settings: () => <div>Settings Panel</div>,
  TrackMeta: () => <div>Meta Panel</div>,
}));

vi.mock('./api/api', () => ({
  useGetFavoritesQuery: () => ({ data: [] }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('renders the main tabs', () => {
    render(<App />);

    expect(screen.getByText('Likes')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Meta')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Likes Panel')).toBeInTheDocument();
    expect(screen.getByTestId('download-panel')).toBeInTheDocument();
    expect(screen.getByText('Meta Panel')).toBeInTheDocument();
    expect(screen.getByText('Settings Panel')).toBeInTheDocument();
  });

  it('opens a shared track in Download and consumes only its share parameters', () => {
    const url = 'https://soundcloud.com/artist/track';
    window.localStorage.setItem('activeTab', 'settings');
    window.history.replaceState({ from: 'test' }, '', `/?share_url=${encodeURIComponent(url)}&keep=1#top`);

    const view = render(<App />);

    expect(screen.getByTestId('download-panel')).toHaveTextContent(url);
    expect(window.localStorage.getItem('activeTab')).toBe('download');
    expect(window.location.search).toBe('?keep=1');
    expect(window.location.hash).toBe('#top');
    expect(window.history.state).toEqual({ from: 'test' });
    expect(notifications.show).not.toHaveBeenCalled();

    view.unmount();
    render(<App />);

    expect(screen.getByTestId('download-panel')).toBeEmptyDOMElement();
  });

  it('opens Download with a single message when the share contains no supported link', () => {
    window.localStorage.setItem('activeTab', 'likes');
    window.history.replaceState(null, '', '/?share_text=hello');

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(screen.getByTestId('download-panel')).toBeEmptyDOMElement();
    expect(window.localStorage.getItem('activeTab')).toBe('download');
    expect(window.location.search).toBe('');
    expect(notifications.show).toHaveBeenCalledTimes(1);
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('SoundCloud or YouTube link') }),
    );
  });

  it('keeps the saved tab for an ordinary launch', () => {
    window.localStorage.setItem('activeTab', 'metadata');

    render(<App />);

    expect(window.localStorage.getItem('activeTab')).toBe('metadata');
    expect(screen.getByTestId('download-panel')).toBeEmptyDOMElement();
    expect(notifications.show).not.toHaveBeenCalled();
  });
});
