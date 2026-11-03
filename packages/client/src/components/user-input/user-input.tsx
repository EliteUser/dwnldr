import { ActionIcon, Avatar, Button, Loader, Text, TextInput } from '@mantine/core';
import { IconUserEdit } from '@tabler/icons-react';
import { memo, useEffect, useRef, useState, type FormEvent } from 'react';

import { isHttpUrl, useProfile } from '../../api';
import { useAppStore } from '../../store';
import { getProxiedImageUrl } from '../../utils/common';
import { notify } from '../../utils/notify';

import styles from './user-input.module.scss';

export const UserInput = memo(() => {
  const profileUrl = useAppStore((state) => state.profileUrl);

  const [draftUrl, setDraftUrl] = useState(profileUrl || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const connectedControlRef = useRef<HTMLButtonElement>(null);
  const shouldFocusConnectedControl = useRef(false);

  const showEditForm = !profileUrl || isEditing;

  const { data: user, error, isLoading, isFetching, refetch } = useProfile(profileUrl);

  const { avatarUrl, name } = user || {};
  const proxiedAvatarUrl = getProxiedImageUrl(avatarUrl);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextProfileUrl = draftUrl.trim();

    // The server validates the profile itself; this only catches text that is not a link at all.
    if (!isHttpUrl(nextProfileUrl)) {
      setValidationError('Enter a profile link, for example https://soundcloud.com/your-name.');
      profileInputRef.current?.focus();
      return;
    }

    setValidationError(null);
    useAppStore.setState({ profileUrl: nextProfileUrl });
    shouldFocusConnectedControl.current = true;
    setIsEditing(false);
  };

  const onInputChange = (value: string) => {
    setDraftUrl(value);

    if (validationError) {
      setValidationError(null);
    }
  };

  const onEditClick = () => {
    setDraftUrl(profileUrl || '');
    setValidationError(null);
    setIsEditing(true);
  };

  const onCancelEdit = () => {
    shouldFocusConnectedControl.current = true;
    setIsEditing(false);
  };

  useEffect(() => {
    if (error) {
      notify.apiError(error);
    }
  }, [error]);

  useEffect(() => {
    if (!showEditForm && !isLoading && shouldFocusConnectedControl.current && connectedControlRef.current) {
      shouldFocusConnectedControl.current = false;
      connectedControlRef.current.focus();
    }
  }, [error, isLoading, profileUrl, showEditForm, user]);

  if (showEditForm) {
    return (
      <form className={`${styles.input} ${styles.editForm}`} onSubmit={onSubmit}>
        <TextInput
          aria-label='SoundCloud profile link'
          autoFocus
          className={styles.profileInput}
          error={validationError}
          label='SoundCloud profile link'
          ref={profileInputRef}
          value={draftUrl}
          onChange={(evt) => onInputChange(evt.target.value)}
          size='lg'
          placeholder='https://soundcloud.com/your-name'
        />
        <div className={styles.actions}>
          <Button type='submit' size='lg' disabled={!draftUrl.trim()}>
            {profileUrl ? 'Save profile' : 'Connect'}
          </Button>
          {profileUrl ? (
            <Button type='button' variant='outline' size='lg' onClick={onCancelEdit}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <div className={styles.profilePanel}>
      {isLoading && !user ? (
        <Text className={styles.status} role='status' aria-live='polite'>
          <Loader size='sm' /> Loading SoundCloud profile...
        </Text>
      ) : null}

      {user ? (
        <div className={styles.profileSummary}>
          <Avatar name={name || 'SoundCloud user'} size='md' src={proxiedAvatarUrl} />
          <Text className={styles.profileName} fw={600}>
            {name || 'SoundCloud user'}
          </Text>
          <ActionIcon
            ref={connectedControlRef}
            variant='outline'
            onClick={onEditClick}
            aria-label='Change SoundCloud profile'
          >
            <IconUserEdit size={16} />
          </ActionIcon>
        </div>
      ) : null}

      {isFetching && user && !error ? (
        <Text className={styles.status} role='status' aria-live='polite'>
          Refreshing SoundCloud profile...
        </Text>
      ) : null}

      {error ? (
        <Text className={styles.status} c={user ? 'yellow' : 'red'} role='alert'>
          {user
            ? 'Could not refresh this profile. Your saved profile is still available.'
            : 'Could not load SoundCloud user.'}
        </Text>
      ) : null}

      {profileUrl && (!user || error) ? (
        <div className={styles.actions}>
          {error ? (
            <Button size='sm' loading={isFetching} onClick={() => void refetch()}>
              Retry
            </Button>
          ) : null}
          {!user ? (
            <Button ref={connectedControlRef} variant='outline' size='sm' onClick={onEditClick}>
              Change profile
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

UserInput.displayName = 'UserInput';
