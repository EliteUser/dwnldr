import { HttpError } from '../errors/http-error.js';
import { soundcloud } from './soundcloud.js';
import type { Provider } from './types.js';
import { youtube } from './youtube.js';
import { downloadWithYtDlp, getTrackWithYtDlp } from './ytdlp-default.js';

export const providers: Provider[] = [soundcloud, youtube];

export const findProvider = (url: string) => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return undefined;
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return undefined;
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  return providers.find(({ hosts }) => hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)));
};

export const requireProvider = (url: string) => {
  const provider = findProvider(url);

  if (!provider) {
    throw new HttpError(400, 'This link is not supported.', { code: 'UNSUPPORTED_SOURCE' });
  }

  return provider;
};

export const getTrack = (url: string, signal: AbortSignal) =>
  (requireProvider(url).getTrack ?? getTrackWithYtDlp)(url, signal);

export const downloadAudio = (url: string, folder: string, signal: AbortSignal) =>
  (requireProvider(url).download ?? downloadWithYtDlp)(url, folder, signal);
