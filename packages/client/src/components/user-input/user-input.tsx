import { PersonPencil } from '@gravity-ui/icons';
import { Avatar, Button, Icon, Loader, Text, TextInput } from '@gravity-ui/uikit';
import { memo, useCallback, useState } from 'react';

import { useGetUserQuery } from '../../api/api';
import { useAppStore } from '../../store';

import styles from './user-input.module.scss';

export const UserInput = memo(() => {
  const userId = useAppStore((state) => state.userId);
  const setUserId = useAppStore((state) => state.setUserId);
  const clearUserId = useAppStore((state) => state.clearUserId);

  const [inputValue, setInputValue] = useState(userId || '');
  const [isEdit, setIsEdit] = useState(!userId);

  const { data: user, isLoading } = useGetUserQuery(userId || '', {
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

  return isLoading ? (
    <Loader size='l' />
  ) : isEdit ? (
    <div className={styles.input}>
      <TextInput
        value={inputValue}
        onChange={(evt) => setInputValue(evt.target.value)}
        size='xl'
        placeholder='SoundCloud user ID'
      />
      <Button onClick={onSyncButtonClick} view='action' size='xl' disabled={!inputValue}>
        Sync
      </Button>
    </div>
  ) : (
    <div className={styles.input}>
      <Avatar className={styles.avatar} text={full_name || 'User Name'} size='l' imgUrl={avatar_url} />
      <Text variant='header-1'>{full_name}</Text>
      <Button view='outlined' size='m' onClick={onChangeUserClick} aria-label='Change SoundCloud user'>
        <Icon data={PersonPencil} size={18} />
      </Button>
    </div>
  );
});

UserInput.displayName = 'UserInput';
