import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getFavoritesMock, getSoundCloudTrackMock, getUserMock } = vi.hoisted(() => ({
  getFavoritesMock: vi.fn(),
  getSoundCloudTrackMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock('./services/soundcloud/soundcloud.service.js', () => ({
  getFavoritesByProfileUrl: getFavoritesMock,
  getSoundCloudTrackByUrl: getSoundCloudTrackMock,
  getUserByProfileUrl: getUserMock,
}));

const { createApp } = await import('./app.js');

describe('SoundCloud profile routes', () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue({
      avatar_url: null,
      full_name: 'Artist',
      id: 1,
      permalink_url: 'https://soundcloud.com/artist',
    });
    getFavoritesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires profileUrl and does not accept the legacy userId query', async () => {
    const response = await request(createApp()).get('/api/soundcloud/users').query({ userId: '123' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_INPUT');
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('passes profileUrl to user and favorites lookup with an optional positive limit', async () => {
    const profileUrl = 'https://soundcloud.com/artist';
    const userResponse = await request(createApp()).get('/api/soundcloud/users').query({ profileUrl });
    const favoritesResponse = await request(createApp())
      .get('/api/soundcloud/favorites')
      .query({ profileUrl, limit: 25 });

    expect(userResponse.status).toBe(200);
    expect(userResponse.body).toMatchObject({
      full_name: 'Artist',
      id: 1,
      permalink_url: profileUrl,
    });
    expect(favoritesResponse.status).toBe(200);
    expect(getUserMock).toHaveBeenCalledWith(profileUrl);
    expect(getFavoritesMock).toHaveBeenCalledWith(profileUrl, 25);
  });
});
