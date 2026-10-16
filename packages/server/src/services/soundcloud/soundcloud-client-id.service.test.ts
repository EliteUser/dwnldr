import { describe, expect, it, vi } from 'vitest';

import { HttpStatusError } from '../http/http.service.js';
import { SoundCloudApiClient } from './soundcloud-api.service.js';
import { discoverSoundCloudClientId, SoundCloudClientIdManager } from './soundcloud-client-id.service.js';

describe('SoundCloud client ID discovery', () => {
  it('finds the client ID in a web asset', async () => {
    const fetchText = vi
      .fn()
      .mockResolvedValueOnce('<script src="https://a-v2.sndcdn.com/assets/app.js"></script>')
      .mockResolvedValueOnce('window.config={client_id:"web_id_123456789012345"};');

    await expect(discoverSoundCloudClientId({ fetchText } as never)).resolves.toBe('web_id_123456789012345');
    expect(fetchText).toHaveBeenCalledTimes(2);
    expect(fetchText.mock.calls[1][0]).toBe('https://a-v2.sndcdn.com/assets/app.js');
  });

  it('falls back to the mobile page when web discovery fails', async () => {
    const fetchText = vi
      .fn()
      .mockRejectedValueOnce(new Error('web unavailable'))
      .mockResolvedValueOnce('<script>window.x={"clientId":"mobile_id_123456789012345"}</script>');

    await expect(discoverSoundCloudClientId({ fetchText } as never)).resolves.toBe('mobile_id_123456789012345');
    expect(fetchText.mock.calls[1][0]).toBe('https://m.soundcloud.com/');
  });

  it('singleflights discovery without letting one caller abort the shared work', async () => {
    let finishDiscovery!: (clientId: string) => void;
    const discover = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishDiscovery = resolve;
        }),
    );
    const manager = new SoundCloudClientIdManager(discover);
    const abortController = new AbortController();
    const abortedCaller = manager.get(abortController.signal);
    const otherCaller = manager.get();

    abortController.abort();
    await expect(abortedCaller).rejects.toMatchObject({ name: 'AbortError' });
    finishDiscovery('shared_client_id_12345');

    await expect(otherCaller).resolves.toBe('shared_client_id_12345');
    expect(discover).toHaveBeenCalledTimes(1);
  });

  it('clears rejected discovery and invalidates only the ID that failed', async () => {
    let discoveryCount = 0;
    const manager = new SoundCloudClientIdManager(async () => {
      discoveryCount += 1;

      if (discoveryCount === 1) {
        throw new Error('temporary failure');
      }

      return `client_id_${discoveryCount}_123456`;
    });

    await expect(manager.get()).rejects.toThrow('temporary failure');
    await expect(manager.get()).resolves.toBe('client_id_2_123456');
    manager.invalidate('different_id');
    await expect(manager.get()).resolves.toBe('client_id_2_123456');
    manager.invalidate('client_id_2_123456');
    await expect(manager.get()).resolves.toBe('client_id_3_123456');
  });
});

describe('SoundCloud API client', () => {
  it('retries one unauthorized request with a newly discovered client ID', async () => {
    let discoveryCount = 0;
    const clientIds = new SoundCloudClientIdManager(async () => {
      discoveryCount += 1;
      return `client_id_${discoveryCount}_123456`;
    });
    const fetchJson = vi
      .fn()
      .mockRejectedValueOnce(new HttpStatusError(403, 'Forbidden'))
      .mockResolvedValueOnce({ id: 3 });
    const api = new SoundCloudApiClient({ clientIds, fetchJson } as never);

    await expect(
      api.getJson<{ id: number }>('https://api-v2.soundcloud.com/resolve?url=https%3A%2F%2Fsoundcloud.com%2Fa%2Fb'),
    ).resolves.toEqual({ id: 3 });

    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(new URL(fetchJson.mock.calls[0][0]).searchParams.get('client_id')).toBe('client_id_1_123456');
    expect(new URL(fetchJson.mock.calls[1][0]).searchParams.get('client_id')).toBe('client_id_2_123456');
  });

  it('does not retry after the second unauthorized response', async () => {
    let discoveryCount = 0;
    const clientIds = new SoundCloudClientIdManager(async () => {
      discoveryCount += 1;
      return `client_id_${discoveryCount}_123456`;
    });
    const fetchJson = vi.fn().mockRejectedValue(new HttpStatusError(401, 'Unauthorized'));
    const api = new SoundCloudApiClient({ clientIds, fetchJson } as never);

    await expect(api.getJson('https://api-v2.soundcloud.com/tracks/4')).rejects.toMatchObject({ status: 401 });
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(discoveryCount).toBe(2);
  });

  it('rejects pagination URLs outside the SoundCloud API origin', async () => {
    const api = new SoundCloudApiClient({
      clientIds: new SoundCloudClientIdManager(async () => 'client_id_123456789012345'),
      fetchJson: vi.fn(),
    } as never);

    await expect(api.getJson('https://example.com/steal?client_id=secret')).rejects.toThrow(
      'untrusted API pagination URL',
    );
  });
});
