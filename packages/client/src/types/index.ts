export type FileData = {
  name: string;
  extension: string;
};

export type ArtworkDownloadPayload = {
  file: File;
  source: 'custom';
};
