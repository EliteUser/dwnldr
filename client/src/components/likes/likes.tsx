import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DropdownMenu, Icon, Loader, Text, TextInput } from '@gravity-ui/uikit';
import { useGetFavoritesQuery } from '../../api/api.slice';
import { UserInput } from '../user-input/user-input.tsx';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';

import { ArrowRotateRight, FolderOpen, Gear, FolderArrowUpIn } from '@gravity-ui/icons';

import styles from './likes.module.scss';
import { Track } from '../track/track.tsx';
import { isTrackDownloaded } from '../../utils';
import { getFolderHandle, getMusicFiles, pickMusicFolder } from '../../utils/folder.utils.ts';
import { setFiles, setFolder } from '../../store/files.slice.ts';

type LikesProps = {
    onDownloadClick: (url: string) => void;
};

const filterFn = (arg: string, filterValue: string) => arg.toLowerCase().includes(filterValue.toLowerCase());

export const Likes = memo<LikesProps>((props) => {
    const { onDownloadClick } = props;

    const dispatch = useDispatch();

    const [filter, setFilter] = useState('');

    const userId = useSelector((state: RootState) => state.user.userId);
    const folder = useSelector((state: RootState) => state.files.folder);
    const musicFiles = useSelector((state: RootState) => state.files.files);

    const {
        data: favorites,
        isLoading,
        refetch,
        isFetching,
    } = useGetFavoritesQuery(userId || '', {
        skip: !userId,
    });

    const hasFolder = !!folder;
    const hasFavorites = !!favorites?.length;

    const filteredFavorites = useMemo(() => {
        if (!favorites?.length) {
            return [];
        }

        return favorites?.filter(({ title, user }) => filterFn(user.username, filter) || filterFn(title, filter));
    }, [favorites, filter]);

    const refreshFiles = useCallback(async () => {
        const musicFiles = await getMusicFiles();
        dispatch(setFiles(musicFiles));
    }, [dispatch]);

    const handleFolderSelect = useCallback(async () => {
        await pickMusicFolder();
        await refreshFiles();
    }, [refreshFiles]);

    useEffect(() => {
        refreshFiles();
    }, [refreshFiles, folder]);

    useEffect(() => {
        const sync = async () => {
            try {
                const dirHandle = await getFolderHandle();

                if (dirHandle) {
                    dispatch(setFolder(dirHandle.name));
                }
            } catch (err) {
                console.error(err);
            }
        };

        sync();
    }, [dispatch]);

    return (
        <div className={styles.likes}>
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
                            action: () => {
                                refetch();
                            },
                            text: 'Sync Data',
                        },
                        {
                            iconStart: <Icon size={16} data={FolderArrowUpIn} />,
                            action: () => {
                                refreshFiles();
                            },
                            text: 'Sync File System',
                            hidden: !hasFolder,
                        },
                        {
                            iconStart: <Icon size={16} data={FolderOpen} />,
                            action: handleFolderSelect,
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

            {!isLoading && userId && !hasFavorites && <Text variant='body-2'>No liked tracks found.</Text>}

            {!isLoading && userId && hasFavorites && (
                <div className={styles.list}>
                    <TextInput
                        size='m'
                        placeholder='Search'
                        value={filter}
                        onChange={(evt) => setFilter(evt.target.value)}
                        hasClear
                    />

                    {filteredFavorites.length > 0 ? (
                        <div className={styles.likesList}>
                            {filteredFavorites.map(({ id, user, title, artwork_url, permalink_url, duration }) => {
                                const trackTitle = `${user.username} - ${title}`;

                                const isDownloaded = !!musicFiles && isTrackDownloaded(musicFiles, trackTitle);

                                return (
                                    <Track
                                        key={id}
                                        title={trackTitle}
                                        duration={duration}
                                        coverUrl={artwork_url}
                                        downloaded={isDownloaded}
                                        onDownloadClick={() => onDownloadClick(permalink_url)}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <Text variant='body-2'>Nothing found</Text>
                    )}
                </div>
            )}
        </div>
    );
});
