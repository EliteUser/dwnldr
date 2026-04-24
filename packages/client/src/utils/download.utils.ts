export const canUseSaveFilePicker = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'showSaveFilePicker' in window;

export const getDownloadFileName = (contentDisposition: string | null, fallbackName: string) => {
  if (!contentDisposition) {
    return fallbackName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return fallbackName;
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);

  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return fallbackName;
};

export const triggerBrowserDownload = (fileName: string, chunks: BlobPart[]) => {
  const blob = new Blob(chunks);
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
};

export const readResponse = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (value: Uint8Array) => Promise<void> | void,
) => {
  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      return;
    }

    if (value) {
      await onChunk(value);
    }
  }
};
