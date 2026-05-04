import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Artwork } from './artwork';
import type * as ArtworkUtils from './artwork.utils';

const validateArtworkFileMock = vi.hoisted(() => vi.fn());

vi.mock('../artwork-editor', () => ({
  ArtworkEditor: ({
    draftUrl,
    initialCrop,
    onApply,
    visible,
  }: {
    draftUrl?: string;
    initialCrop?: { height?: number; unit?: string; width?: number; x?: number; y?: number };
    onApply: (file: File, crop: { height: number; unit: '%'; width: number; x: number; y: number }) => void;
    visible: boolean;
  }) =>
    visible ? (
      <div data-testid='artwork-editor'>
        <span data-testid='draft-url'>{draftUrl}</span>
        <span data-testid='initial-crop'>{initialCrop ? JSON.stringify(initialCrop) : ''}</span>
        <button
          type='button'
          onClick={() =>
            onApply(new File(['cropped'], 'cropped.png', { type: 'image/png' }), {
              unit: '%',
              x: 12,
              y: 8,
              width: 76,
              height: 76,
            })
          }
        >
          Apply crop
        </button>
      </div>
    ) : null,
}));

vi.mock('./artwork.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof ArtworkUtils>();

  return {
    ...actual,
    validateArtworkFile: validateArtworkFileMock,
  };
});

describe('Artwork', () => {
  beforeEach(() => {
    validateArtworkFileMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reopens custom artwork edits from the original uploaded image', async () => {
    const onArtworkChange = vi.fn();
    const createObjectURLMock = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:original')
      .mockReturnValueOnce('blob:preview');

    render(
      <Artwork
        providerArtworkUrl='https://img.example.test/provider.jpg'
        resetKey='track-1'
        onArtworkChange={onArtworkChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Upload image'), {
      target: {
        files: [new File(['original'], 'cover.jpg', { type: 'image/jpeg' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('draft-url')).toHaveTextContent('blob:original');
    });

    fireEvent.click(screen.getByText('Apply crop'));

    await waitFor(() => {
      expect(onArtworkChange).toHaveBeenLastCalledWith({
        file: expect.objectContaining({
          name: 'cropped.png',
          type: 'image/png',
        }),
        source: 'custom',
      });
    });

    expect(createObjectURLMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByLabelText('Crop artwork'));

    await waitFor(() => {
      expect(screen.getByTestId('draft-url')).toHaveTextContent('blob:original');
    });
    expect(screen.getByTestId('initial-crop')).toHaveTextContent(
      JSON.stringify({
        unit: '%',
        x: 12,
        y: 8,
        width: 76,
        height: 76,
      }),
    );
  });
});
