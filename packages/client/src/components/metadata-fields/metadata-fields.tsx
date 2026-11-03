import { Textarea, TextInput } from '@mantine/core';
import { memo } from 'react';

import styles from './metadata-fields.module.scss';

type MetadataFieldsProps = {
  album: string;
  lyrics: string;
  name: string;
  onAlbumChange: (value: string) => void;
  onLyricsChange: (value: string) => void;
  onNameChange: (value: string) => void;
};

export const MetadataFields = memo<MetadataFieldsProps>((props) => {
  const { album, lyrics, name, onAlbumChange, onLyricsChange, onNameChange } = props;

  return (
    <div className={styles.fields}>
      <TextInput
        value={name}
        onChange={(evt) => onNameChange(evt.target.value)}
        label='Track Name'
        placeholder='Track name'
        required
      />

      <TextInput
        label='Album'
        value={album}
        onChange={(evt) => onAlbumChange(evt.target.value)}
        placeholder='Album (optional)'
      />

      <Textarea
        label='Lyrics'
        placeholder='Lyrics (optional)'
        className={styles.textarea}
        value={lyrics}
        onChange={(evt) => onLyricsChange(evt.target.value)}
        minRows={5}
        autosize
      />
    </div>
  );
});

MetadataFields.displayName = 'MetadataFields';
