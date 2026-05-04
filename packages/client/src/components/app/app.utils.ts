import { ACTIVE_TAB_STORAGE_KEY, DEFAULT_TAB, ENABLED_TABS } from './app.constants';
import type { ActiveTab, AppTabs } from './app.types';

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
