import { HttpError } from '../../errors/http-error.js';

const SOUNDCLOUD_PROFILE_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com']);
const RESERVED_PROFILE_SLUGS = new Set([
  'about',
  'artists',
  'blog',
  'charts',
  'community',
  'contact',
  'copyright',
  'discover',
  'download',
  'features',
  'for',
  'genres',
  'groups',
  'help',
  'imprint',
  'jobs',
  'legal',
  'likes',
  'login',
  'messages',
  'mobile',
  'music',
  'pages',
  'people',
  'playlists',
  'popular',
  'press',
  'privacy',
  'pro',
  'search',
  'settings',
  'signin',
  'sign-in',
  'signup',
  'sign-up',
  'stations',
  'stream',
  'tags',
  'terms-of-use',
  'tracks',
  'upload',
  'users',
  'you',
]);

const invalidProfileUrl = () =>
  new HttpError(400, 'Enter a SoundCloud profile URL.', {
    code: 'INVALID_INPUT',
  });

export const normalizeSoundCloudProfileUrl = (profileUrl: string) => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(profileUrl.trim());
  } catch {
    throw invalidProfileUrl();
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.port ||
    !SOUNDCLOUD_PROFILE_HOSTS.has(parsedUrl.hostname.toLowerCase())
  ) {
    throw invalidProfileUrl();
  }

  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (segments.length < 1 || segments.length > 2 || (segments.length === 2 && segments[1].toLowerCase() !== 'likes')) {
    throw invalidProfileUrl();
  }

  let slug: string;

  try {
    slug = decodeURIComponent(segments[0]);
  } catch {
    throw invalidProfileUrl();
  }

  if (
    !slug ||
    slug.includes('/') ||
    slug.includes('\\') ||
    /[?#]/.test(slug) ||
    /^\d+$/.test(slug) ||
    RESERVED_PROFILE_SLUGS.has(slug.toLowerCase())
  ) {
    throw invalidProfileUrl();
  }

  return `https://soundcloud.com/${encodeURIComponent(slug)}`;
};

export const normalizeSoundCloudTrackUrl = (trackUrl: string) => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trackUrl.trim());
  } catch {
    throw new HttpError(400, 'Enter a valid SoundCloud track URL.', {
      code: 'INVALID_INPUT',
    });
  }

  const host = parsedUrl.hostname.toLowerCase();
  const isSoundCloudHost = host === 'soundcloud.com' || host.endsWith('.soundcloud.com');
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.port ||
    !isSoundCloudHost ||
    segments.length < 1
  ) {
    throw new HttpError(400, 'Enter a valid SoundCloud track URL.', {
      code: 'INVALID_INPUT',
    });
  }

  try {
    segments.forEach((segment) => decodeURIComponent(segment));
  } catch {
    throw new HttpError(400, 'Enter a valid SoundCloud track URL.', {
      code: 'INVALID_INPUT',
    });
  }

  parsedUrl.protocol = 'https:';
  parsedUrl.hash = '';
  return parsedUrl.toString();
};
