import { ActionIcon, Badge, Button, Loader, Text, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { memo, useEffect } from 'react';

import { useGetFavoritesQuery } from '../../api/api';
import { useAppStore } from '../../store';
import { canUseFileSystemAccess, getApiErrorFromQueryError, useNotify } from '../../utils';
import { TrackList } from '../track-list/track-list';

import styles from './likes.module.scss';

type LikesProps = {
  onDownloadClick: (url: string) => void;
};

export const Likes = memo<LikesProps>((props) => {
  const { onDownloadClick } = props;

  const userId = useAppStore((state) => state.userId);
  const folder = useAppStore((state) => state.directoryName);
  const notify = useNotify();

  const {
    refetch,
    data: favorites,
    error: favoritesError,
    isLoading,
    isFetching,
  } = useGetFavoritesQuery(userId || '', {
    skip: !userId,
  });

  const hasFolder = !!folder;
  const hasFavorites = !!favorites?.length;
  const supportsFileSystemAccess = canUseFileSystemAccess();
  const isInitialLoading = !!userId && (isLoading || (isFetching && !favorites));
  const isRefreshingList = isFetching && !isInitialLoading && hasFavorites;

  useEffect(() => {
    if (favoritesError) {
      notify.apiError(getApiErrorFromQueryError(favoritesError), {
        name: 'likes-fetch-error',
      });
    }
  }, [favoritesError, notify]);

  return (
    <div className={styles.likes}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Title size='h2'>Likes</Title>

          {favorites?.length ? (
            <Badge size='md' color='indigo'>
              {favorites.length}
            </Badge>
          ) : null}
        </div>

        <ActionIcon
          aria-label='Refresh likes'
          variant='outline'
          size='lg'
          disabled={!userId || isFetching}
          onClick={() => refetch()}
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </div>

      {isInitialLoading && true && (
        <div className={styles.loadingState}>
          <Loader size='lg' />
        </div>
      )}

      {!isInitialLoading && !userId && (
        <div className={styles.emptyState}>
          <Text fw={600}>Connect SoundCloud in Settings to load your likes</Text>
          <Text c='dimmed'>The Services section stores the SoundCloud account used for this list.</Text>
        </div>
      )}

      {!isInitialLoading && !!userId && favoritesError && (
        <div className={styles.emptyState}>
          <Text fw={600}>Failed to load your likes</Text>
          <Text c='dimmed'>The request did not complete successfully. Retry after checking the notification.</Text>
          <Button size='md' onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isInitialLoading && !!userId && !favoritesError && hasFavorites && !hasFolder && supportsFileSystemAccess && (
        <div className={styles.emptyState}>
          <Text fw={600}>Pick a download location in Settings</Text>
          <Text c='dimmed'>Folder sync compares cloud tracks against filenames in your local library.</Text>
        </div>
      )}

      {!isInitialLoading && !!userId && !favoritesError && !hasFavorites && (
        <div className={styles.emptyState}>
          <Text fw={600}>No liked tracks found</Text>
          <Text c='dimmed'>This SoundCloud account does not have any favorites available right now.</Text>
        </div>
      )}

      {!isInitialLoading && !!userId && !favoritesError && hasFavorites && (
        <div className={styles.listShell}>
          <TrackList tracks={favorites} onDownloadClick={onDownloadClick} />

          {isRefreshingList && (
            <div className={styles.refreshOverlay}>
              <Loader size='lg' />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

Likes.displayName = 'Likes';
