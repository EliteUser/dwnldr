export type TrackProps = {
    name?: string;
    album?: string;
    lyrics?: string;
};

export type TrackOptions = TrackProps & {
    url: string;
};

export type TrackProcessOptions = TrackProps & {
    folder: string;
};
