import ffmpegPath from 'ffmpeg-static';
import { YtDlp } from 'ytdlp-nodejs';

export const ffmpegBinaryPath = (ffmpegPath as unknown as string | null) ?? undefined;

export const createYtDlp = () =>
  new YtDlp({
    ffmpegPath: ffmpegBinaryPath,
  });

export const assertYtDlpAvailable = async (ytdlp: YtDlp = createYtDlp()) => {
  const installed = await ytdlp.checkInstallationAsync({ ffmpeg: true });

  if (!installed) {
    throw new Error('yt-dlp or ffmpeg is not available. Ensure the runtime includes both binaries.');
  }

  return ytdlp;
};
