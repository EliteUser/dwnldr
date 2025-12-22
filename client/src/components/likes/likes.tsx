import { memo, useEffect } from 'react';
import { Button, DropdownMenu, Icon, Loader, Progress } from '@gravity-ui/uikit';
import { useGetFavoritesQuery } from '../../api/api.slice';
import { UserInput } from '../user-input/user-input';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

import { ArrowRotateRight, FolderArrowUpIn, FolderOpen, Gear } from '@gravity-ui/icons';
import styles from './likes.module.scss';
import { handleSelectFolder, handleSyncFolder } from '../../utils/folder.utils';
import { TrackList } from '../track-list/track-list';

type LikesProps = {
    onDownloadClick: (url: string) => void;
};

export const Likes = memo<LikesProps>((props) => {
    const { onDownloadClick } = props;

    const userId = useSelector((state: RootState) => state.user.userId);

    const isSyncInProgress = useSelector((state: RootState) => state.files.loading);
    const folder = useSelector((state: RootState) => state.files.directoryName);
    const musicFiles = useSelector((state: RootState) => state.files.files);

    const {
        refetch,
        data: favorites,
        isLoading,
        isFetching,
    } = useGetFavoritesQuery(userId || '', {
        skip: !userId,
    });

    const hasFolder = !!folder;
    const hasFavorites = !!favorites?.length;

    useEffect(() => {
        const rafId = window.requestAnimationFrame(() => {
            (async () => {
                if (!isLoading) {
                    await handleSyncFolder();
                }
            })();
        });

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [isLoading]);

    return (
        <div className={styles.likes}>
            {isSyncInProgress && <Progress className={styles.progress} value={100} loading theme='info' size='xs' />}

            <div className={styles.header}>
                <UserInput />

                <DropdownMenu
                    size='xl'
                    renderSwitcher={(props) => (
                        <Button {...props} view='outlined' size='xl'>
                            <Icon size={16} data={Gear} />
                        </Button>
                    )}
                    popupProps={{
                        placement: 'bottom-end',
                    }}
                    items={[
                        {
                            iconStart: <Icon size={16} data={ArrowRotateRight} />,
                            action: () => refetch(),
                            text: 'Sync Data',
                        },
                        {
                            iconStart: <Icon size={16} data={FolderArrowUpIn} />,
                            action: () => handleSyncFolder(),
                            text: 'Sync File System',
                            hidden: !hasFolder,
                        },
                        {
                            iconStart: <Icon size={16} data={FolderOpen} />,
                            action: () => handleSelectFolder(),
                            text: 'Pick Music Folder',
                        },
                    ]}
                />
            </div>

            {(isLoading || isFetching) && (
                <div className={styles.loader}>
                    <Loader size='l' />
                </div>
            )}

            {!isLoading && userId && hasFavorites && (
                <TrackList tracks={favorites} files={musicFiles} onDownloadClick={onDownloadClick} />
            )}
        </div>
    );
});

Likes.displayName = 'Likes';
