import ffmpegPath from 'ffmpeg-static';
import { YtDlp } from 'ytdlp-nodejs';

export const createYtDlp = () =>
  new YtDlp({
    ffmpegPath: (ffmpegPath as unknown as string | null) ?? undefined,
  });

export const assertYtDlpAvailable = async () => {
  const installed = await createYtDlp().checkInstallationAsync({ ffmpeg: true });

  if (!installed) {
    throw new Error('yt-dlp or ffmpeg is not available. Ensure the runtime includes both binaries.');
  }
};
