import sharp from 'sharp';

export const cropToCenterSquare = async (buffer: Buffer): Promise<Buffer> => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  const side = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - side) / 2);
  const top = Math.floor((metadata.height - side) / 2);

  return image
    .extract({
      left,
      top,
      width: side,
      height: side,
    })
    .toBuffer();
};

export const resizeImage = async (buffer: Buffer, size: number = 512): Promise<Buffer> => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || metadata.width < size) {
    return buffer;
  }

  return image
    .resize(size, size, {
      fit: 'fill',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
};

export const saveThumbnailFromUrl = async (url: string, outputPath: string, signal?: AbortSignal) => {
  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to download thumbnail');
  }

  const originalBuffer = Buffer.from(await response.arrayBuffer());
  const squareBuffer = await cropToCenterSquare(originalBuffer);
  const finalImage = await resizeImage(squareBuffer);

  await sharp(finalImage).png().toFile(outputPath);

  return outputPath;
};
