import { beforeEach, describe, expect, it, vi } from 'vitest';

const usersGetMock = vi.fn();
const likesMock = vi.fn();
const tracksGetMock = vi.fn();

vi.mock('../../lib/soundcloud.js', () => ({
  soundcloud: {
    users: {
      get: usersGetMock,
      likes: likesMock,
    },
    tracks: {
      get: tracksGetMock,
    },
  },
}));

const { getSoundCloudTrackByUrl } = await import('./soundcloud.service.js');

describe('getSoundCloudTrackByUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps unauthorized upstream errors to UPSTREAM_UNAUTHORIZED', async () => {
    tracksGetMock.mockRejectedValue({
      response: {
        status: 401,
      },
    });

    await expect(getSoundCloudTrackByUrl('https://soundcloud.com/artist/track')).rejects.toMatchObject({
      code: 'UPSTREAM_UNAUTHORIZED',
      statusCode: 502,
    });
  });

  it('maps generic upstream failures to UPSTREAM_FAILURE', async () => {
    tracksGetMock.mockRejectedValue(new Error('network down'));

    await expect(getSoundCloudTrackByUrl('https://soundcloud.com/artist/track')).rejects.toMatchObject({
      code: 'UPSTREAM_FAILURE',
      statusCode: 502,
    });
  });
});
