import { getProviderByUrl } from '../../providers';
import { ACTIVE_TAB_STORAGE_KEY, DEFAULT_TAB, ENABLED_TABS, SHARE_QUERY_KEYS } from './app.constants';
import type { ActiveTab, AppTabs } from './app.types';

export type IncomingShare = { status: 'none' } | { status: 'unsupported' } | { status: 'supported'; url: string };

const SHARED_URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)\]}]+$/u;

export const readIncomingShare = (search: string): IncomingShare => {
  const params = new URLSearchParams(search);

  if (!SHARE_QUERY_KEYS.some((key) => params.has(key))) {
    return { status: 'none' };
  }

  for (const key of SHARE_QUERY_KEYS) {
    const value = params.get(key) ?? '';

    for (const match of value.matchAll(SHARED_URL_PATTERN)) {
      const url = match[0].replace(TRAILING_URL_PUNCTUATION, '');

      try {
        const parsedUrl = new URL(url);
        const provider = getProviderByUrl(url);

        if ((parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && provider?.capabilities.downloads) {
          return { status: 'supported', url };
        }
      } catch {
        // Continue looking for another shared URL.
      }
    }
  }

  return { status: 'unsupported' };
};

export const removeIncomingShareParams = (location: Location) => {
  const url = new URL(location.href);

  SHARE_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));

  return `${url.pathname}${url.search}${url.hash}`;
};

export const isActiveTab = (value: string | null): value is ActiveTab => {
  return value !== null && ENABLED_TABS.includes(value as AppTabs);
};

export const readActiveTab = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_TAB;
  }

  const activeTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);

  return isActiveTab(activeTab) ? activeTab : DEFAULT_TAB;
};
