import { ArrowRotateRight } from '@gravity-ui/icons';
import { Button, Icon, Loader, Progress, Text } from '@gravity-ui/uikit';
import { memo, useCallback, useEffect, useMemo } from 'react';

import { useGetFavoritesQuery } from '../../api/api';
import { useAppStore } from '../../store';
import { syncFolder } from '../../store/folder.actions';
import {
  canUseFileSystemAccess,
  getApiErrorFromQueryError,
  useNotify,
  FOLDER_NOTIFICATION_MESSAGE,
  FOLDER_NOTIFICATION_NAME,
} from '../../utils';
import { TrackList } from '../track-list/track-list';

import styles from './likes.module.scss';

type LikesProps = {
  onDownloadClick: (url: string) => void;
  onFavoritesCountChange: (count: number) => void;
};

export const Likes = memo<LikesProps>((props) => {
  const { onDownloadClick, onFavoritesCountChange } = props;

  const userId = useAppStore((state) => state.userId);
  const isSyncInProgress = useAppStore((state) => state.isFolderSyncInProgress);
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

  const syncButtonLabel = useMemo(() => (isFetching ? 'Refreshing' : 'Refresh'), [isFetching]);

  const runSyncFolder = useCallback(async () => {
    const result = await syncFolder();

    if (result.status === 'error') {
      notify.error(FOLDER_NOTIFICATION_MESSAGE.syncError, {
        name: FOLDER_NOTIFICATION_NAME.syncError,
      });
      return;
    }

    if (result.status === 'permission-denied') {
      notify.error(FOLDER_NOTIFICATION_MESSAGE.permissionDenied, {
        name: FOLDER_NOTIFICATION_NAME.permissionDenied,
      });
    }
  }, [notify]);

  useEffect(() => {
    if (!folder || !supportsFileSystemAccess) {
      return;
    }

    void runSyncFolder();
  }, [folder, runSyncFolder, supportsFileSystemAccess]);

  useEffect(() => {
    onFavoritesCountChange(favorites?.length ?? 0);
  }, [favorites?.length, onFavoritesCountChange]);

  useEffect(() => {
    if (favoritesError) {
      notify.apiError(getApiErrorFromQueryError(favoritesError), {
        name: 'likes-fetch-error',
      });
    }
  }, [favoritesError, notify]);

  return (
    <div className={styles.likes}>
      {isSyncInProgress && <Progress className={styles.progress} value={100} loading theme='info' size='xs' />}

      <div className={styles.header}>
        <Text variant='header-1'>Likes</Text>

        <Button view='outlined' size='l' disabled={!userId || isFetching} onClick={() => refetch()}>
          <Icon size={16} data={ArrowRotateRight} />
          {syncButtonLabel}
        </Button>
      </div>

      {(isLoading || isFetching) && (
        <div className={styles.loader}>
          <Loader size='l' />
        </div>
      )}

      {!isLoading && !userId && (
        <div className={styles.emptyState}>
          <Text variant='subheader-2'>Connect SoundCloud in Settings to load your likes</Text>
          <Text variant='body-2' color='secondary'>
            The Services section stores the SoundCloud account used for this list.
          </Text>
        </div>
      )}

      {!isLoading && !!userId && favoritesError && (
        <div className={styles.emptyState}>
          <Text variant='subheader-2'>Failed to load your likes</Text>
          <Text variant='body-2' color='secondary'>
            The request did not complete successfully. Retry after checking the notification.
          </Text>
          <Button view='action' size='l' onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !!userId && !favoritesError && hasFavorites && !hasFolder && supportsFileSystemAccess && (
        <div className={styles.emptyState}>
          <Text variant='subheader-2'>Pick a download location in Settings</Text>
          <Text variant='body-2' color='secondary'>
            Folder sync compares cloud tracks against filenames in your local library.
          </Text>
        </div>
      )}

      {!isLoading && !!userId && !favoritesError && !hasFavorites && (
        <div className={styles.emptyState}>
          <Text variant='subheader-2'>No liked tracks found</Text>
          <Text variant='body-2' color='secondary'>
            This SoundCloud account does not have any favorites available right now.
          </Text>
        </div>
      )}

      {!isLoading && !!userId && !favoritesError && hasFavorites && (
        <TrackList tracks={favorites} onDownloadClick={onDownloadClick} />
      )}
    </div>
  );
});

Likes.displayName = 'Likes';
