export type TrackProps = {
  name?: string;
  album?: string;
  lyrics?: string;
};

export type TrackOptions = TrackProps & {
  url: string;
};

export type TrackProcessOptions = TrackProps & {
  filePath: string;
  name: string;
};

export type TrackMetadata = {
  id: number | string;
  artwork_url: string | null;
  permalink_url: string;
  duration: number;
  title: string;
  user: string;
};
