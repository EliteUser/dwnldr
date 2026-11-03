import { notifications } from '@mantine/notifications';
import { screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { App } from './app';

vi.mock('../download/download', () => ({
  Download: ({ selectedUrl }: { selectedUrl?: string }) => <div data-testid='download-panel'>{selectedUrl}</div>,
}));
vi.mock('../likes/likes', () => ({ Likes: () => <div>Likes Panel</div> }));
vi.mock('../settings/settings', () => ({ Settings: () => <div>Settings Panel</div> }));
vi.mock('../track-meta/track-meta', () => ({ TrackMeta: () => <div>Meta Panel</div> }));

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('renders the tabs and opens the saved one', () => {
    window.localStorage.setItem('activeTab', 'metadata');

    renderWithProviders(<App />);

    expect(screen.getByRole('tab', { name: 'Likes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Meta' })).toHaveAttribute('aria-selected', 'true');
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('opens a shared link in Download and removes only the share parameters', () => {
    const url = 'https://soundcloud.com/artist/track';
    window.localStorage.setItem('activeTab', 'settings');
    window.history.replaceState({ from: 'test' }, '', `/?share_url=${encodeURIComponent(url)}&keep=1#top`);

    renderWithProviders(<App />);

    expect(screen.getByTestId('download-panel')).toHaveTextContent(url);
    expect(screen.getByRole('tab', { name: 'Download' })).toHaveAttribute('aria-selected', 'true');
    expect(window.localStorage.getItem('activeTab')).toBe('download');
    expect(`${window.location.search}${window.location.hash}`).toBe('?keep=1#top');
    expect(window.history.state).toEqual({ from: 'test' });
  });

  it('shows one message when the share has no link', () => {
    window.history.replaceState(null, '', '/?share_text=hello');

    renderWithProviders(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(screen.getByTestId('download-panel')).toBeEmptyDOMElement();
    expect(window.location.search).toBe('');
    expect(notifications.show).toHaveBeenCalledTimes(1);
  });
});
