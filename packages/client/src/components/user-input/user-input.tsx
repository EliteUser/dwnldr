import { ActionIcon, Avatar, Button, Loader, Text, TextInput } from '@mantine/core';
import { IconUserEdit } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useState } from 'react';

import { useGetUserQuery } from '../../api/api';
import { useAppStore } from '../../store';
import { getApiErrorFromQueryError, useNotify } from '../../utils';

import styles from './user-input.module.scss';

export const UserInput = memo(() => {
  const notify = useNotify();

  const userId = useAppStore((state) => state.userId);
  const setUserId = useAppStore((state) => state.setUserId);
  const clearUserId = useAppStore((state) => state.clearUserId);

  const [inputValue, setInputValue] = useState(userId || '');
  const [isEdit, setIsEdit] = useState(!userId);

  const {
    data: user,
    error,
    isLoading,
  } = useGetUserQuery(userId || '', {
    skip: !userId,
  });

  const { avatar_url, full_name } = user || {};

  const onSyncButtonClick = useCallback(() => {
    if (inputValue) {
      setUserId(inputValue);
      setIsEdit(false);
    }
  }, [inputValue, setUserId]);

  const onChangeUserClick = useCallback(() => {
    clearUserId();
    setInputValue('');
    setIsEdit(true);
  }, [clearUserId]);

  useEffect(() => {
    if (error) {
      notify.apiError(getApiErrorFromQueryError(error), {
        name: 'settings-user-fetch-error',
      });
    }
  }, [error, notify]);

  return isLoading ? (
    <Loader size='lg' />
  ) : !isEdit && error ? (
    <div className={styles.input}>
      <Text c='red'>Could not load SoundCloud user.</Text>
      <Button variant='outline' size='sm' onClick={onChangeUserClick}>
        Change user
      </Button>
    </div>
  ) : isEdit ? (
    <div className={styles.input}>
      <TextInput
        value={inputValue}
        onChange={(evt) => setInputValue(evt.target.value)}
        size='lg'
        placeholder='SoundCloud user ID'
      />
      <Button onClick={onSyncButtonClick} size='lg' disabled={!inputValue}>
        Sync
      </Button>
    </div>
  ) : (
    <div className={styles.input}>
      <Avatar name={full_name || 'User Name'} size='md' src={avatar_url} />
      <Text fw={600}>{full_name}</Text>
      <ActionIcon variant='outline' onClick={onChangeUserClick} aria-label='Change SoundCloud user'>
        <IconUserEdit size={16} />
      </ActionIcon>
    </div>
  );
});

UserInput.displayName = 'UserInput';
