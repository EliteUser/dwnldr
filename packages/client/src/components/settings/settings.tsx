import { FolderArrowUpIn, FolderOpen } from '@gravity-ui/icons';
import { Button, Disclosure, Icon, Progress, Text } from '@gravity-ui/uikit';
import { memo, useCallback, useMemo } from 'react';

import { useAppStore } from '../../store';
import { selectFolder, syncFolder } from '../../store/folder.actions';
import {
  canUseFileSystemAccess,
  FILE_SYSTEM_ACCESS_HELP_TEXT,
  FOLDER_NOTIFICATION_MESSAGE,
  FOLDER_NOTIFICATION_NAME,
  useNotify,
} from '../../utils';
import { UserInput } from '../user-input/user-input';

import styles from './settings.module.scss';

export const Settings = memo(() => {
  const directoryName = useAppStore((state) => state.directoryName);
  const fileCount = useAppStore((state) => state.files.length);
  const isSyncInProgress = useAppStore((state) => state.isFolderSyncInProgress);
  const lastSyncAt = useAppStore((state) => state.lastSyncAt);
  const notify = useNotify();

  const supportsFileSystemAccess = canUseFileSystemAccess();

  const formattedLastSyncAt = useMemo(() => {
    if (!lastSyncAt) {
      return null;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      hourCycle: 'h24',
      timeStyle: 'short',
    }).format(new Date(lastSyncAt));
  }, [lastSyncAt]);

  const runSyncFolder = useCallback(
    async (options: { notifyOnStart?: boolean; notifyOnSuccess?: boolean } = {}) => {
      if (options.notifyOnStart && directoryName) {
        notify.info(FOLDER_NOTIFICATION_MESSAGE.syncStarted(directoryName), {
          name: FOLDER_NOTIFICATION_NAME.syncStarted,
        });
      }

      const result = await syncFolder();

      if (result.status === 'success' && options.notifyOnSuccess) {
        notify.success(FOLDER_NOTIFICATION_MESSAGE.syncSuccess(result.fileCount, result.directoryName), {
          name: FOLDER_NOTIFICATION_NAME.syncSuccess,
        });
      }

      if (result.status === 'error') {
        notify.error(FOLDER_NOTIFICATION_MESSAGE.syncError, {
          name: FOLDER_NOTIFICATION_NAME.syncError,
        });
      }
    },
    [directoryName, notify],
  );

  const runSelectFolder = useCallback(async () => {
    const result = await selectFolder();

    if (result.status === 'unsupported') {
      notify.error(FOLDER_NOTIFICATION_MESSAGE.fileSystemAccessError, {
        name: FOLDER_NOTIFICATION_NAME.apiUnsupported,
      });
      return;
    }

    if (result.status === 'success') {
      notify.success(FOLDER_NOTIFICATION_MESSAGE.syncSuccess(result.fileCount, result.directoryName), {
        name: FOLDER_NOTIFICATION_NAME.syncSuccess,
      });
      return;
    }

    if (result.status === 'error') {
      notify.error(FOLDER_NOTIFICATION_MESSAGE.pickerError, {
        name: FOLDER_NOTIFICATION_NAME.pickerError,
      });
    }
  }, [notify]);

  return (
    <div className={styles.settings}>
      {isSyncInProgress && <Progress className={styles.progress} value={100} loading theme='info' size='xs' />}

      <div className={styles.header}>
        <Text variant='display-1'>Settings</Text>
      </div>

      <div className={styles.content}>
        <Disclosure
          className={styles.section}
          defaultExpanded
          keepMounted
          size='l'
          summary={<Text variant='subheader-2'>Services</Text>}
        >
          <Disclosure.Details>
            <div className={styles.sectionContent}>
              <div className={styles.serviceBlock}>
                <Text variant='body-2' color='secondary'>
                  SoundCloud
                </Text>
                <UserInput />
              </div>
            </div>
          </Disclosure.Details>
        </Disclosure>

        <Disclosure
          className={styles.section}
          defaultExpanded
          keepMounted
          size='l'
          summary={<Text variant='subheader-2'>Sync Folder</Text>}
        >
          <Disclosure.Details>
            <div className={styles.sectionContent}>
              {supportsFileSystemAccess ? (
                <>
                  <div className={styles.folderStatus}>
                    <Text variant='body-2'>{directoryName || 'No folder selected'}</Text>
                    <Text variant='caption-2' color='secondary'>
                      {directoryName
                        ? `${fileCount} files indexed${formattedLastSyncAt ? ` - ${formattedLastSyncAt}` : ''}`
                        : 'Pick the folder where your moved music files live.'}
                    </Text>
                  </div>

                  <div className={styles.actions}>
                    <Button view='outlined-action' size='l' onClick={() => void runSelectFolder()}>
                      <Icon size={16} data={FolderOpen} />
                      Pick Folder
                    </Button>

                    <Button
                      view='outlined'
                      size='l'
                      disabled={!directoryName || isSyncInProgress}
                      onClick={() => void runSyncFolder({ notifyOnStart: true, notifyOnSuccess: true })}
                    >
                      <Icon size={16} data={FolderArrowUpIn} />
                      Sync Folder
                    </Button>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <Text variant='subheader-2'>File System Access unavailable</Text>
                  <Text variant='body-2' color='complementary'>
                    {FILE_SYSTEM_ACCESS_HELP_TEXT}
                  </Text>
                  <Text variant='caption-2' color='secondary'>
                    Use HTTPS on your deployed domain. On local desktop development, localhost also counts as a secure
                    context.
                  </Text>
                </div>
              )}
            </div>
          </Disclosure.Details>
        </Disclosure>
      </div>
    </div>
  );
});

Settings.displayName = 'Settings';
