import type { ActiveTab, AppTabs } from './app.types';

export const ACTIVE_TAB_STORAGE_KEY = 'activeTab';
export const ENABLED_TABS: AppTabs[] = ['likes', 'download', 'metadata', 'settings'];
export const DEFAULT_TAB: ActiveTab = 'likes';
