import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtworkEditor } from './artwork-editor';
import type * as ArtworkEditorUtils from './artwork-editor.utils';
import { renderCroppedArtwork } from './artwork-editor.utils';

vi.mock('./artwork-editor.utils', async (importOriginal) => ({
  ...(await importOriginal<typeof ArtworkEditorUtils>()),
  renderCroppedArtwork: vi.fn(),
}));

describe('ArtworkEditor', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not apply a crop that finishes rendering after the editor closes', async () => {
    let finishRendering: ((file: File) => void) | undefined;
    vi.mocked(renderCroppedArtwork).mockReturnValueOnce(
      new Promise<File>((resolve) => {
        finishRendering = resolve;
      }),
    );
    const onApply = vi.fn();
    const { unmount } = render(<ArtworkEditor draftUrl='blob:image' visible onApply={onApply} onClose={vi.fn()} />);
    const image = document.querySelector('img[src="blob:image"]');
    expect(image).toBeInstanceOf(HTMLImageElement);
    Object.defineProperties(image, {
      naturalWidth: { value: 256 },
      naturalHeight: { value: 256 },
      width: { value: 256 },
      height: { value: 256 },
    });
    fireEvent.load(image as HTMLImageElement);
    fireEvent.click(screen.getByText('Apply'));
    expect(renderCroppedArtwork).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => finishRendering?.(new File(['cropped'], 'cropped.png', { type: 'image/png' })));

    expect(onApply).not.toHaveBeenCalled();
  });
});
