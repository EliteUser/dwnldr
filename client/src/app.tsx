import { memo, useCallback, useState } from 'react';

import { TabList, Tab, Icon, TabPanel, TabProvider } from '@gravity-ui/uikit';
import { Heart, ArrowShapeDownToLine, MusicNote } from '@gravity-ui/icons';

import { Likes } from './components';

import styles from './app.module.scss';
import { Download } from './components/download/download.tsx';
import { useGetFavoritesQuery } from './api/api.slice.ts';
import { useSelector } from 'react-redux';
import { RootState } from './store';

export const App = memo(() => {
    const [activeTab, setActiveTab] = useState('likes');
    const [selectedUrl, setSelectedUrl] = useState<string | undefined>(undefined);

    const userId = useSelector((state: RootState) => state.user.userId);
    const { data: favorites } = useGetFavoritesQuery(userId || '', {
        skip: !userId,
    });

    const handleDownloadClick = useCallback((url: string) => {
        setSelectedUrl(url);
        setActiveTab('download');
    }, []);

    return (
        <div className={styles.app}>
            <TabProvider value={activeTab} onUpdate={setActiveTab}>
                <div className={styles.tabPanels}>
                    <TabPanel className={styles.tabPanel} value='likes'>
                        <Likes onDownloadClick={handleDownloadClick} />
                    </TabPanel>
                    <TabPanel className={styles.tabPanel} value='download'>
                        <Download selectedUrl={selectedUrl} />
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
                        label={{ content: favorites ? favorites?.length : null }}
                    >
                        Likes
                    </Tab>
                    <Tab className={styles.tab} value='download' icon={<Icon size={16} data={ArrowShapeDownToLine} />}>
                        Download
                    </Tab>
                    <Tab className={styles.tab} value='metadata' icon={<Icon size={16} data={MusicNote} />} disabled>
                        Meta
                    </Tab>
                </TabList>
            </TabProvider>
        </div>
    );
});
