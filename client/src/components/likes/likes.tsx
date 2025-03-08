import { memo, useMemo, useState } from 'react';
import { Button, Text, Icon, Loader, TextInput } from '@gravity-ui/uikit';
import { useGetFavoritesQuery } from '../../api/api.slice';
import { UserInput } from '../user-input/user-input.tsx';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

import { ArrowRotateRight } from '@gravity-ui/icons';

import styles from './likes.module.scss';
import { Track } from '../track/track.tsx';

type LikesProps = {
    onDownloadClick: (url: string) => void;
};

const filterFn = (arg: string, filterValue: string) => arg.toLowerCase().includes(filterValue.toLowerCase());

export const Likes = memo<LikesProps>((props) => {
    const { onDownloadClick } = props;

    const [filter, setFilter] = useState('');

    const userId = useSelector((state: RootState) => state.user.userId);

    const {
        data: favorites,
        isLoading,
        refetch,
        isFetching,
    } = useGetFavoritesQuery(userId || '', {
        skip: !userId,
    });

    const hasFavorites = !!favorites?.length;

    const filteredFavorites = useMemo(() => {
        if (!favorites?.length) {
            return [];
        }

        return favorites?.filter(({ title, user }) => filterFn(user.username, filter) || filterFn(title, filter));
    }, [favorites, filter]);

    return (
        <div className={styles.likes}>
            <div className={styles.header}>
                <UserInput />

                <Button className={styles.button} view='outlined' size='xl' onClick={() => refetch()}>
                    <Icon size={16} data={ArrowRotateRight} />
                </Button>
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
                            {filteredFavorites.map(({ id, user, title, artwork_url, permalink_url, duration }) => (
                                <Track
                                    key={id}
                                    title={`${user.username} - ${title}`}
                                    duration={duration}
                                    coverUrl={artwork_url}
                                    onDownloadClick={() => onDownloadClick(permalink_url)}
                                />
                            ))}
                        </div>
                    ) : (
                        <Text variant='body-2'>Nothing found</Text>
                    )}
                </div>
            )}
        </div>
    );
});
