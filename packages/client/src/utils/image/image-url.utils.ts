const REMOTE_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);

export const getProxiedImageUrl = (url: string | null | undefined) => {
  if (!url) {
    return '';
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url, window.location.origin);
  } catch {
    return url;
  }

  if (!REMOTE_IMAGE_PROTOCOLS.has(parsedUrl.protocol) || parsedUrl.origin === window.location.origin) {
    return url;
  }

  const params = new URLSearchParams({
    url: parsedUrl.href,
  });

  return `/api/artwork?${params}`;
};
