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

  const profileUrl = useAppStore((state) => state.profileUrl);
  const folder = useAppStore((state) => state.directoryName);
  const notify = useNotify();

  const {
    refetch,
    data: favorites,
    error: favoritesError,
    isLoading,
    isFetching,
  } = useGetFavoritesQuery(profileUrl || '', {
    skip: !profileUrl,
  });

  const hasFolder = !!folder;
  const hasCachedFavorites = favorites !== undefined;
  const hasFavorites = !!favorites?.length;
  const supportsFileSystemAccess = canUseFileSystemAccess();
  const isInitialLoading = !!profileUrl && (isLoading || (isFetching && !hasCachedFavorites));
  const isRefreshingList = isFetching && !isInitialLoading && hasCachedFavorites;
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
            <Badge size='md' color='orange'>
              {favorites.length}
            </Badge>
          ) : null}
        </div>

        <ActionIcon
          aria-label='Refresh likes'
          variant='outline'
          size='lg'
          disabled={!profileUrl || isFetching}
          onClick={() => void refetch()}
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </div>

      {isInitialLoading && (
        <div className={styles.loadingState} role='status' aria-live='polite'>
          <Loader size='lg' />
          <Text>Loading your likes...</Text>
        </div>
      )}

      {!isInitialLoading && !profileUrl && (
        <div className={styles.emptyState}>
          <Text fw={600}>Add your SoundCloud profile link in Settings to load your likes</Text>
          <Text c='dimmed'>The Services section stores the profile used for this list.</Text>
        </div>
      )}

      {!isInitialLoading && !!profileUrl && favoritesError && !hasCachedFavorites && (
        <div className={styles.emptyState} role='alert'>
          <Text fw={600}>Failed to load your likes</Text>
          <Text c='dimmed'>The request did not complete successfully. Retry after checking the notification.</Text>
          <Button size='md' loading={isFetching} onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isInitialLoading && !!profileUrl && favoritesError && hasCachedFavorites && (
        <div className={styles.refreshError} role='alert'>
          <Text>Could not refresh your likes. Showing the last loaded results.</Text>
          <Button size='sm' loading={isFetching} onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {isRefreshingList && (
        <Text className={styles.refreshStatus} role='status' aria-live='polite'>
          Refreshing your likes...
        </Text>
      )}

      {!isInitialLoading &&
        !!profileUrl &&
        hasCachedFavorites &&
        hasFavorites &&
        !hasFolder &&
        supportsFileSystemAccess && (
          <div className={styles.emptyState}>
            <Text fw={600}>Pick a download location in Settings</Text>
            <Text c='dimmed'>Folder sync compares cloud tracks against filenames in your local library.</Text>
          </div>
        )}

      {!isInitialLoading && !!profileUrl && hasCachedFavorites && !hasFavorites && (
        <div className={styles.emptyState}>
          <Text fw={600}>No liked tracks found</Text>
          <Text c='dimmed'>This SoundCloud account does not have any favorites available right now.</Text>
        </div>
      )}

      {!isInitialLoading && !!profileUrl && hasCachedFavorites && hasFavorites && (
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
