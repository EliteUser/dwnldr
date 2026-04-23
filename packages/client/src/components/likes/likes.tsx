import { ArrowRotateRight, FolderArrowUpIn, FolderOpen, Gear } from '@gravity-ui/icons';
import { Button, DropdownMenu, Icon, Loader, Progress, Text } from '@gravity-ui/uikit';
import { memo, useEffect, useMemo } from 'react';

import { useGetFavoritesQuery } from '../../api/api.slice';
import { useAppSelector } from '../../store';
import {
  canUseFileSystemAccess,
  FILE_SYSTEM_ACCESS_HELP_TEXT,
  getApiErrorFromRtkError,
  handleSelectFolder,
  handleSyncFolder,
  useNotify,
} from '../../utils';
import { TrackList } from '../track-list/track-list';
import { UserInput } from '../user-input/user-input';

import styles from './likes.module.scss';

type LikesProps = {
  onDownloadClick: (url: string) => void;
  onFavoritesCountChange: (count: number) => void;
};

export const Likes = memo<LikesProps>((props) => {
  const { onDownloadClick, onFavoritesCountChange } = props;

  const userId = useAppSelector((state) => state.user.userId);
  const isSyncInProgress = useAppSelector((state) => state.files.loading);
  const folder = useAppSelector((state) => state.files.directoryName);
  const fileCount = useAppSelector((state) => state.files.files.length);
  const lastSyncAt = useAppSelector((state) => state.files.lastSyncAt);
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

  const formattedLastSyncAt = useMemo(() => {
    if (!lastSyncAt) {
      return null;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      hourCycle: 'h24',
    }).format(new Date(lastSyncAt));
  }, [lastSyncAt]);

  const syncMenuInfoText = useMemo(() => {
    if (!hasFolder) {
      return undefined;
    }

    if (isSyncInProgress) {
      return `Syncing ${folder}`;
    }

    if (!formattedLastSyncAt) {
      return `Folder: ${folder}`;
    }

    return `${fileCount} files in ${folder} • ${formattedLastSyncAt}`;
  }, [fileCount, folder, formattedLastSyncAt, hasFolder, isSyncInProgress]);

  useEffect(() => {
    if (!folder || !supportsFileSystemAccess) {
      return;
    }

    void handleSyncFolder({
      notifyOnStart: false,
      notifyOnSuccess: false,
    });
  }, [folder, supportsFileSystemAccess]);

  useEffect(() => {
    onFavoritesCountChange(favorites?.length ?? 0);
  }, [favorites?.length, onFavoritesCountChange]);

  useEffect(() => {
    if (favoritesError) {
      notify.apiError(getApiErrorFromRtkError(favoritesError), {
        name: 'likes-fetch-error',
      });
    }
  }, [favoritesError, notify]);

  return (
    <div className={styles.likes}>
      {isSyncInProgress && <Progress className={styles.progress} value={100} loading theme='info' size='xs' />}

      <div className={styles.header}>
        <UserInput />

        <DropdownMenu
          size='xl'
          renderSwitcher={(dropdownProps) => (
            <Button {...dropdownProps} view='outlined' size='xl' aria-label='Open likes actions'>
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
              action: () => undefined,
              disabled: true,
              text: syncMenuInfoText,
              hidden: !syncMenuInfoText,
            },
            {
              iconStart: <Icon size={16} data={FolderArrowUpIn} />,
              action: () => handleSyncFolder(),
              text: 'Sync File System',
              hidden: !hasFolder || !supportsFileSystemAccess,
            },
            {
              iconStart: <Icon size={16} data={FolderOpen} />,
              action: () => handleSelectFolder(),
              text: 'Pick Music Folder',
              disabled: !supportsFileSystemAccess,
            },
          ]}
        />
      </div>

      {!supportsFileSystemAccess && (
        <div className={styles.emptyState}>
          <Text variant='subheader-2'>File System Access unavailable</Text>
          <Text variant='body-2' color='complementary'>
            {FILE_SYSTEM_ACCESS_HELP_TEXT}
          </Text>
          <Text variant='caption-2' color='secondary'>
            Use HTTPS on your deployed domain. On local desktop development, `localhost` also counts as a secure
            context.
          </Text>
        </div>
      )}

      {(isLoading || isFetching) && (
        <div className={styles.loader}>
          <Loader size='l' />
        </div>
      )}

      {!isLoading && !userId && (
        <div className={styles.emptyState}>
          <Text variant='subheader-2'>Enter your SoundCloud user ID to load your likes</Text>
          <Text variant='body-2' color='secondary'>
            Sync your profile first, then pick a music folder to compare downloaded tracks.
          </Text>
        </div>
      )}

      {!isLoading && !!userId && favoritesError && (
        <div className={styles.emptyState}>
          <Text variant='subheader-2'>Failed to load your likes</Text>
          <Text variant='body-2' color='secondary'>
            The request did not complete successfully. Retry after checking the server notification.
          </Text>
          <Button view='action' size='l' onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !!userId && !favoritesError && hasFavorites && !hasFolder && supportsFileSystemAccess && (
        <div className={styles.emptyState}>
          <Text variant='subheader-2'>Pick a music folder to see which tracks you&apos;ve already downloaded</Text>
          <Text variant='body-2' color='secondary'>
            Folder sync compares cloud tracks against filenames in your local library.
          </Text>
          <Button view='outlined-action' size='l' onClick={() => handleSelectFolder()}>
            Pick Music Folder
          </Button>
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
