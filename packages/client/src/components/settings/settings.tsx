import { Accordion, Button, Text } from '@mantine/core';
import { IconFolderOpen, IconFolderUp } from '@tabler/icons-react';
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
  const notify = useNotify();

  const directoryName = useAppStore((state) => state.directoryName);
  const fileCount = useAppStore((state) => state.files.length);
  const isSyncInProgress = useAppStore((state) => state.isFolderSyncInProgress);
  const lastSyncAt = useAppStore((state) => state.lastSyncAt);

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
      const shouldUpdateSyncNotification = Boolean(options.notifyOnStart && directoryName);
      const getSyncNotificationOptions = (name: string) => {
        if (!shouldUpdateSyncNotification) {
          return { name };
        }

        return {
          name: FOLDER_NOTIFICATION_NAME.syncStarted,
          update: true,
        };
      };

      if (options.notifyOnStart && directoryName) {
        notify.info(FOLDER_NOTIFICATION_MESSAGE.syncStarted(directoryName), {
          autoClose: false,
          loading: true,
          name: FOLDER_NOTIFICATION_NAME.syncStarted,
          withCloseButton: false,
        });
      }

      const result = await syncFolder();

      if (result.status === 'success') {
        if (options.notifyOnSuccess || shouldUpdateSyncNotification) {
          notify.success(
            FOLDER_NOTIFICATION_MESSAGE.syncSuccess(result.fileCount, result.directoryName),
            getSyncNotificationOptions(FOLDER_NOTIFICATION_NAME.syncSuccess),
          );
        }

        return;
      }

      if (result.status === 'error') {
        notify.error(
          FOLDER_NOTIFICATION_MESSAGE.syncError,
          getSyncNotificationOptions(FOLDER_NOTIFICATION_NAME.syncError),
        );
        return;
      }

      if (result.status === 'permission-denied') {
        notify.error(
          FOLDER_NOTIFICATION_MESSAGE.permissionDenied,
          getSyncNotificationOptions(FOLDER_NOTIFICATION_NAME.permissionDenied),
        );
        return;
      }

      if (result.status === 'missing-handle') {
        notify.info(
          FOLDER_NOTIFICATION_MESSAGE.missingHandle,
          getSyncNotificationOptions(FOLDER_NOTIFICATION_NAME.missingHandle),
        );
        return;
      }

      if (result.status === 'unsupported') {
        notify.error(
          FOLDER_NOTIFICATION_MESSAGE.fileSystemAccessError,
          getSyncNotificationOptions(FOLDER_NOTIFICATION_NAME.apiUnsupported),
        );
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
      return;
    }

    if (result.status === 'permission-denied') {
      notify.error(FOLDER_NOTIFICATION_MESSAGE.permissionDenied, {
        name: FOLDER_NOTIFICATION_NAME.permissionDenied,
      });
    }
  }, [notify]);

  return (
    <div className={styles.settings}>
      <div className={styles.content}>
        <Accordion
          className={styles.panel}
          defaultValue='services'
          variant='unstyled'
          chevronPosition='left'
          chevronIconSize={24}
        >
          <Accordion.Item value='services'>
            <Accordion.Control>
              <Text fw={600}>Services</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <div className={styles.sectionContent}>
                <div className={styles.serviceBlock}>
                  <Text c='dimmed'>SoundCloud</Text>
                  <UserInput />
                </div>
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Accordion
          className={styles.panel}
          defaultValue='sync-folder'
          variant='unstyled'
          chevronPosition='left'
          chevronIconSize={24}
        >
          <Accordion.Item value='sync-folder'>
            <Accordion.Control>
              <Text fw={600}>Sync Folder</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <div className={styles.sectionContent}>
                {supportsFileSystemAccess ? (
                  <>
                    <div className={styles.folderStatus}>
                      <Text>{directoryName || 'No folder selected'}</Text>
                      <Text size='sm' c='dimmed'>
                        {directoryName
                          ? `${fileCount} files indexed${formattedLastSyncAt ? ` - ${formattedLastSyncAt}` : ''}`
                          : 'Pick the folder where your moved music files live.'}
                      </Text>
                    </div>

                    <div className={styles.actions}>
                      <Button
                        variant='filled'
                        size='sm'
                        leftSection={<IconFolderOpen size={16} />}
                        onClick={() => void runSelectFolder()}
                      >
                        Pick Folder
                      </Button>

                      <Button
                        variant='outline'
                        size='sm'
                        leftSection={<IconFolderUp size={16} />}
                        loading={isSyncInProgress}
                        disabled={!directoryName || isSyncInProgress}
                        onClick={() => void runSyncFolder({ notifyOnStart: true, notifyOnSuccess: true })}
                      >
                        Sync Folder
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <Text fw={600}>File System Access unavailable</Text>
                    <Text>{FILE_SYSTEM_ACCESS_HELP_TEXT}</Text>
                    <Text size='sm' c='dimmed'>
                      Use HTTPS on your deployed domain. On local desktop development, localhost also counts as a secure
                      context.
                    </Text>
                  </div>
                )}
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
});

Settings.displayName = 'Settings';
