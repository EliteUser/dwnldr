import { memo, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PersonPencil } from '@gravity-ui/icons';
import { Avatar, Button, Icon, Loader, Text, TextInput } from '@gravity-ui/uikit';

import { setUserId } from '../../store/user.slice';
import { useGetUserQuery } from '../../api/api.slice.ts';
import { RootState } from '../../store';

import styles from './user-input.module.scss';

export const UserInput = memo(() => {
    const dispatch = useDispatch();
    const userId = useSelector((state: RootState) => state.user.userId);

    const [inputValue, setInputValue] = useState(userId || '');
    const [isEdit, setIsEdit] = useState(!userId);

    const { data: user, isLoading } = useGetUserQuery(userId || '', {
        skip: !userId,
    });

    const { avatar_url, full_name } = user || {};

    const onSyncButtonClick = useCallback(() => {
        if (inputValue) {
            dispatch(setUserId(inputValue));
            setIsEdit(false);
        }
    }, [dispatch, inputValue]);

    return isLoading ? (
        <Loader size='l' />
    ) : isEdit ? (
        <div className={styles.input}>
            <TextInput
                value={inputValue}
                onChange={(evt) => setInputValue(evt.target.value)}
                size='xl'
                placeholder='Soundcloud user ID'
            />
            <Button onClick={onSyncButtonClick} view='action' size='xl' disabled={!inputValue}>
                Sync
            </Button>
        </div>
    ) : (
        <div className={styles.input}>
            <Avatar className={styles.avatar} text={full_name || 'User Name'} size='l' imgUrl={avatar_url} />
            <Text variant='header-1'>{full_name}</Text>
            <Button view='outlined' size='m' onClick={() => setIsEdit(true)}>
                <Icon data={PersonPencil} size={18} />
            </Button>
        </div>
    );
});
