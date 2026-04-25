import { ArrowShapeDownToLine, Gear, Heart, MusicNote } from '@gravity-ui/icons';
import { TabList, Tab, Icon, TabPanel, TabProvider } from '@gravity-ui/uikit';
import { memo, useCallback, useEffect, useState } from 'react';

import { Download, Likes, Settings } from './components';

import styles from './app.module.scss';

const ACTIVE_TAB_STORAGE_KEY = 'activeTab';
const ENABLED_TABS = ['likes', 'download', 'settings'] as const;
type ActiveTab = (typeof ENABLED_TABS)[number];

const DEFAULT_TAB: ActiveTab = 'likes';

const isActiveTab = (value: string | null): value is ActiveTab =>
  value !== null && ENABLED_TABS.includes(value as ActiveTab);

const readActiveTab = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_TAB;
  }

  const activeTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);

  return isActiveTab(activeTab) ? activeTab : DEFAULT_TAB;
};

export const App = memo(() => {
  const [activeTab, setActiveTab] = useState(readActiveTab);
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(undefined);
  const [favoritesCount, setFavoritesCount] = useState(0);

  const handleDownloadClick = useCallback((url: string) => {
    setSelectedUrl(url);
    setActiveTab('download');
  }, []);

  const handleTabChange = useCallback((value: string) => {
    if (isActiveTab(value)) {
      setActiveTab(value);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  return (
    <div className={styles.app}>
      <TabProvider value={activeTab} onUpdate={handleTabChange}>
        <div className={styles.tabPanels}>
          <TabPanel className={styles.tabPanel} value='likes'>
            <Likes onDownloadClick={handleDownloadClick} onFavoritesCountChange={setFavoritesCount} />
          </TabPanel>

          <TabPanel className={styles.tabPanel} value='download'>
            <Download selectedUrl={selectedUrl} />
          </TabPanel>

          <TabPanel className={styles.tabPanel} value='settings'>
            <Settings />
          </TabPanel>

          <TabPanel className={styles.tabPanel} value='metadata'>
            Meta Panel
          </TabPanel>
        </div>

        <TabList className={styles.tabList} size='xl'>
          <Tab
            className={styles.tab}
            value='likes'
            icon={<Icon size={16} data={Heart} />}
            label={{ content: favoritesCount || null }}
          >
            Likes
          </Tab>

          <Tab className={styles.tab} value='download' icon={<Icon size={16} data={ArrowShapeDownToLine} />}>
            Download
          </Tab>

          <Tab className={styles.tab} value='metadata' icon={<Icon size={16} data={MusicNote} />} disabled>
            Meta
          </Tab>

          <Tab className={styles.tab} value='settings' icon={<Icon size={16} data={Gear} />}>
            Settings
          </Tab>
        </TabList>
      </TabProvider>
    </div>
  );
});
