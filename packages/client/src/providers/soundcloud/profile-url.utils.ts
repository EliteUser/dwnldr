const SOUNDCLOUD_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com']);

const RESERVED_PROFILE_PATHS = new Set([
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

export const normalizeSoundCloudProfileUrl = (value: string): string | null => {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    !SOUNDCLOUD_HOSTS.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 2 && pathSegments[1].toLowerCase() === 'likes') {
    pathSegments.pop();
  }

  if (pathSegments.length !== 1) {
    return null;
  }

  let slug: string;

  try {
    slug = decodeURIComponent(pathSegments[0]);
  } catch {
    return null;
  }

  if (
    !slug ||
    /^\d+$/.test(slug) ||
    slug.includes('/') ||
    slug.includes('\\') ||
    slug.includes('?') ||
    slug.includes('#') ||
    RESERVED_PROFILE_PATHS.has(slug.toLowerCase())
  ) {
    return null;
  }

  return `https://soundcloud.com/${encodeURIComponent(slug)}`;
};
