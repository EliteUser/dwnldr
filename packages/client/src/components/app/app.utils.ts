export const TABS = ['likes', 'download', 'metadata', 'settings'] as const;

export type Tab = (typeof TABS)[number];

const ACTIVE_TAB_STORAGE_KEY = 'activeTab';
const SHARE_QUERY_KEYS = ['share_url', 'share_text', 'share_title'] as const;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,!?;:)\]}]+$/u;

export type IncomingShare = { status: 'none' } | { status: 'no-link' } | { status: 'link'; url: string };

/** Reads a Web Share Target launch (see manifest.webmanifest) and picks the first link it carries. */
export const readIncomingShare = (search: string): IncomingShare => {
  const params = new URLSearchParams(search);

  if (!SHARE_QUERY_KEYS.some((key) => params.has(key))) {
    return { status: 'none' };
  }

  for (const key of SHARE_QUERY_KEYS) {
    for (const [match] of (params.get(key) ?? '').matchAll(URL_PATTERN)) {
      const url = match.replace(TRAILING_PUNCTUATION, '');

      if (URL.canParse(url)) {
        return { status: 'link', url };
      }
    }
  }

  return { status: 'no-link' };
};

export const removeIncomingShareParams = (location: Location) => {
  const url = new URL(location.href);

  SHARE_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));

  return `${url.pathname}${url.search}${url.hash}`;
};

export const isTab = (value: string | null): value is Tab => TABS.includes(value as Tab);

export const readActiveTab = (): Tab => {
  const value = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);

  return isTab(value) ? value : 'likes';
};

export const saveActiveTab = (tab: Tab) => window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
