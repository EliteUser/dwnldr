import { Accordion, Button, Text } from '@mantine/core';
import { IconFolderOpen, IconFolderUp } from '@tabler/icons-react';
import { memo, useCallback, useMemo } from 'react';

import { useAppStore } from '../../store';
import { canUseFileSystemAccess, type FolderSyncResult, selectFolder, syncFolder } from '../../utils/folder';
import { notify } from '../../utils/notify';
import { UserInput } from '../user-input/user-input';

import styles from './settings.module.scss';

const SYNC_NOTIFICATION_ID = 'folder-sync';

const getResultMessage = (result: FolderSyncResult) =>
  result.ok ? `${result.fileCount} files found in ${result.directoryName}` : result.message;

export const Settings = memo(() => {
  const directoryName = useAppStore((state) => state.directoryName);
  const fileCount = useAppStore((state) => state.files.length);
  const isSyncInProgress = useAppStore((state) => state.isFolderSyncInProgress);
  const lastSyncAt = useAppStore((state) => state.lastSyncAt);

  const supportsFileSystemAccess = canUseFileSystemAccess();

  const formattedLastSyncAt = useMemo(
    () =>
      lastSyncAt
        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', hourCycle: 'h24', timeStyle: 'short' }).format(
            new Date(lastSyncAt),
          )
        : null,
    [lastSyncAt],
  );

  const handleSync = useCallback(async () => {
    notify.progress(SYNC_NOTIFICATION_ID, `Syncing ${directoryName}`);

    const result = await syncFolder();

    notify.finish(SYNC_NOTIFICATION_ID, result.ok ? 'green' : 'red', getResultMessage(result) ?? 'Sync canceled.');
  }, [directoryName]);

  const handleSelect = useCallback(async () => {
    const result = await selectFolder();
    const message = getResultMessage(result);

    // A cancelled picker has no message and needs no notification.
    if (message) {
      (result.ok ? notify.success : notify.error)(message);
    }
  }, []);

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
                        onClick={() => void handleSelect()}
                      >
                        Pick Folder
                      </Button>

                      <Button
                        variant='outline'
                        size='sm'
                        leftSection={<IconFolderUp size={16} />}
                        loading={isSyncInProgress}
                        disabled={!directoryName || isSyncInProgress}
                        onClick={() => void handleSync()}
                      >
                        Sync Folder
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <Text fw={600}>File System Access unavailable</Text>
                    <Text>
                      Folder sync needs a browser with the File System Access API and a secure (HTTPS) connection.
                    </Text>
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
