import { ArrowRotateRight, FolderArrowUpIn, FolderOpen, Gear } from '@gravity-ui/icons';
import { Button, DropdownMenu, Icon, Loader, Progress, Text } from '@gravity-ui/uikit';
import { memo, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useGetFavoritesQuery } from '../../api/api.slice';
import { RootState } from '../../store';
import {
  canUseFileSystemAccess,
  FILE_SYSTEM_ACCESS_HELP_TEXT,
  handleSelectFolder,
  handleSyncFolder,
} from '../../utils/folder.utils';
import { TrackList } from '../track-list/track-list';
import { UserInput } from '../user-input/user-input';

import styles from './likes.module.scss';

type LikesProps = {
  onDownloadClick: (url: string) => void;
};

export const Likes = memo<LikesProps>((props) => {
  const { onDownloadClick } = props;

  const userId = useSelector((state: RootState) => state.user.userId);
  const isSyncInProgress = useSelector((state: RootState) => state.files.loading);
  const folder = useSelector((state: RootState) => state.files.directoryName);

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
  const supportsFileSystemAccess = canUseFileSystemAccess();

  useEffect(() => {
    void (async () => {
      if (!isLoading) {
        await handleSyncFolder();
      }
    })();
  }, [isLoading]);

  return (
    <div className={styles.likes}>
      {isSyncInProgress && <Progress className={styles.progress} value={100} loading theme='info' size='xs' />}

      <div className={styles.header}>
        <UserInput />

        <DropdownMenu
          size='xl'
          renderSwitcher={(dropdownProps) => (
            <Button {...dropdownProps} view='outlined' size='xl'>
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
        <div className={styles.notice}>
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

      {!isLoading && userId && hasFavorites && <TrackList tracks={favorites} onDownloadClick={onDownloadClick} />}
    </div>
  );
});

Likes.displayName = 'Likes';
