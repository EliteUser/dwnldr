import type { FlexProps } from '@mantine/core';
import { Flex, Tabs, Text } from '@mantine/core';
import { IconDownload, IconHeart, IconMusic, IconSettings } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { useNotify } from '../../utils';
import { Download, Likes, Settings, TrackMeta } from '../index';
import { ACTIVE_TAB_STORAGE_KEY } from './app.constants.ts';
import { isActiveTab, readActiveTab, readIncomingShare, removeIncomingShareParams } from './app.utils.ts';

import styles from './app.module.scss';

export const App = memo(() => {
  const [incomingShare] = useState(() =>
    readIncomingShare(typeof window === 'undefined' ? '' : window.location.search),
  );
  const [activeTab, setActiveTab] = useState(() => (incomingShare.status === 'none' ? readActiveTab() : 'download'));
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(
    incomingShare.status === 'supported' ? incomingShare.url : undefined,
  );
  const shareHandledRef = useRef(false);
  const notify = useNotify();

  const handleDownloadClick = useCallback((url: string) => {
    setSelectedUrl(url);
    setActiveTab('download');
  }, []);

  const handleTabChange = useCallback((value: string | null) => {
    if (isActiveTab(value)) {
      setActiveTab(value);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (incomingShare.status === 'none' || shareHandledRef.current) {
      return;
    }

    shareHandledRef.current = true;
    window.history.replaceState(window.history.state, '', removeIncomingShareParams(window.location));

    if (incomingShare.status === 'unsupported') {
      notify.error('No SoundCloud or YouTube link was shared. Paste a track URL to continue.', {
        name: 'unsupported-shared-link',
      });
    }
  }, [incomingShare, notify]);

  const tabFlexProps: FlexProps = {
    direction: 'column',
    justify: 'start',
    align: 'center',
    gap: 4,
  };

  return (
    <div className={styles.app}>
      <Tabs
        className={styles.tabs}
        styles={{
          root: { display: 'flex', flexDirection: 'column', blockSize: '100%', maxBlockSize: '100%' },
          panel: { display: 'flex', flexBasis: 0, flexGrow: 1, minBlockSize: 0 },
          tabLabel: { display: 'flex', justifyContent: 'center' },
          tab: { '--tab-hover-color': 'rgba(0,0,0,0.05)', flexShrink: 0, padding: '8px 8px 4px', '--tab-radius': 0 },
          list: { flexWrap: 'nowrap', '--tab-border-color': 'transparent' },
        }}
        value={activeTab}
        onChange={handleTabChange}
      >
        <Tabs.Panel className={styles.tabPanel} value='likes'>
          <Likes onDownloadClick={handleDownloadClick} />
        </Tabs.Panel>

        <Tabs.Panel className={styles.tabPanel} value='download'>
          <Download selectedUrl={selectedUrl} />
        </Tabs.Panel>

        <Tabs.Panel className={styles.tabPanel} value='settings'>
          <Settings />
        </Tabs.Panel>

        <Tabs.Panel className={styles.tabPanel} value='metadata'>
          <TrackMeta />
        </Tabs.Panel>

        <Tabs.List className={styles.tabList} grow>
          <Tabs.Tab className={styles.tab} value='likes'>
            <Flex {...tabFlexProps}>
              <IconHeart size={24} />
              <Text size='sm'>Likes</Text>
            </Flex>
          </Tabs.Tab>

          <Tabs.Tab className={styles.tab} value='download'>
            <Flex {...tabFlexProps}>
              <IconDownload size={24} />
              <Text size='sm'>Download</Text>
            </Flex>
          </Tabs.Tab>

          <Tabs.Tab className={styles.tab} value='metadata'>
            <Flex {...tabFlexProps}>
              <IconMusic size={24} /> <Text size='sm'>Meta</Text>
            </Flex>
          </Tabs.Tab>

          <Tabs.Tab className={styles.tab} value='settings'>
            <Flex {...tabFlexProps}>
              <IconSettings size={24} /> <Text size='sm'>Settings</Text>
            </Flex>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </div>
  );
});
