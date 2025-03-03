import { memo } from 'react';
import { Button, Avatar, Text, Icon, Loader } from '@gravity-ui/uikit';
import { useGetFavoritesQuery } from '../../api/api.slice';
import { UserInput } from '../user-input/user-input.tsx';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

import { ArrowRotateRight, ArrowShapeDownToLine } from '@gravity-ui/icons';

import styles from './likes.module.scss';

type LikesProps = {
    onDownloadClick: (url: string) => void;
};

export const Likes = memo<LikesProps>((props) => {
    const { onDownloadClick } = props;

    const userId = useSelector((state: RootState) => state.user.userId);

    const {
        data: favorites,
        isLoading,
        refetch,
        isFetching,
    } = useGetFavoritesQuery(userId || '', {
        skip: !userId,
    });

    return (
        <div className={styles.likes}>
            <div className={styles.header}>
                <UserInput />

                <Button className={styles.button} view='outlined' size='xl' onClick={() => refetch()}>
                    <Icon size={16} data={ArrowRotateRight} />
                </Button>
            </div>

            {(isLoading || isFetching) && (
                <div className={styles.wrapper}>
                    <Loader size='l' />
                </div>
            )}

            {favorites && favorites.length > 0 ? (
                <div className={styles.likesList}>
                    {favorites.map(({ id, user, title, artwork_url, permalink_url }) => (
                        <div key={id} className={styles.track}>
                            <Avatar className={styles.cover} size='l' imgUrl={artwork_url} />

                            <Text>{`${user.username} - ${title}`}</Text>

                            <Button
                                className={styles.button}
                                view='outlined-action'
                                onClick={() => onDownloadClick(permalink_url)}
                            >
                                <Icon size={16} data={ArrowShapeDownToLine} />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                userId && !isLoading && <Text variant='body-2'>No liked tracks found.</Text>
            )}
        </div>
    );
});
