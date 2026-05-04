import type { Crop } from 'react-image-crop';

export type ArtworkEditorProps = {
  disabled?: boolean;
  draftUrl?: string;
  initialCrop?: Crop;
  onApply: (file: File, crop: Crop) => void;
  onClose: () => void;
  visible: boolean;
};

export type ImageSize = {
  height: number;
  width: number;
};
