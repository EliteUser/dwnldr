export type MetadataFieldsProps = {
  album: string;
  lyrics: string;
  name: string;
  onAlbumChange: (value: string) => void;
  onLyricsChange: (value: string) => void;
  onNameChange: (value: string) => void;
};
