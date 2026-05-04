export type TrackMetaMetadata = {
  album: string;
  artwork: {
    dataUrl: string;
    mimeType: string;
  } | null;
  lyrics: string;
  name: string;
};
