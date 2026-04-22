import ffmpegPath from 'ffmpeg-static';
import { YtDlp } from 'ytdlp-nodejs';

export const createYtDlp = () =>
  new YtDlp({
    ffmpegPath: (ffmpegPath as unknown as string | null) ?? undefined,
  });
