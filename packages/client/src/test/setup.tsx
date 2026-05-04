import type { ReactNode } from 'react';
import { vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

const renderChildren = ({ children }: { children?: ReactNode }) => <>{children}</>;
const iconMock = () => null;

vi.mock('@tabler/icons-react', () => ({
  IconBrandSoundcloud: iconMock,
  IconBrandYoutube: iconMock,
  IconCancel: iconMock,
  IconDownload: iconMock,
  IconCrop: iconMock,
  IconFolderOpen: iconMock,
  IconFolderUp: iconMock,
  IconHeart: iconMock,
  IconLink: iconMock,
  IconMusic: iconMock,
  IconPencil: iconMock,
  IconPhoto: iconMock,
  IconPhotoOff: iconMock,
  IconRefresh: iconMock,
  IconRotate: iconMock,
  IconSearch: iconMock,
  IconSettings: iconMock,
  IconUpload: iconMock,
  IconUserEdit: iconMock,
}));

vi.mock('@mantine/notifications', () => ({
  Notifications: renderChildren,
  notifications: {
    show: vi.fn(),
    hide: vi.fn(),
    update: vi.fn(),
    clean: vi.fn(),
    cleanQueue: vi.fn(),
  },
}));

vi.mock('@mantine/core', () => {
  const Accordion = Object.assign(({ children }: { children?: ReactNode }) => <section>{children}</section>, {
    Item: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Control: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Panel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  });

  return {
    Accordion,
    ActionIcon: ({
      children,
      disabled,
      onClick,
      ...props
    }: {
      children?: ReactNode;
      disabled?: boolean;
      onClick?: () => void;
    }) => (
      <button disabled={disabled} onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Avatar: ({ className }: { className?: string }) => <div className={className} />,
    Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    Button: ({
      children,
      disabled,
      leftSection: _leftSection,
      onClick,
      rightSection: _rightSection,
      variant: _variant,
      ...props
    }: {
      children?: ReactNode;
      disabled?: boolean;
      leftSection?: ReactNode;
      onClick?: () => void;
      rightSection?: ReactNode;
      variant?: string;
    }) => (
      <button disabled={disabled} onClick={onClick} {...props}>
        {children}
      </button>
    ),
    CloseButton: ({
      disabled,
      onClick,
      'aria-label': ariaLabel,
    }: {
      disabled?: boolean;
      onClick?: () => void;
      'aria-label'?: string;
    }) => (
      <button aria-label={ariaLabel} disabled={disabled} onClick={onClick}>
        x
      </button>
    ),
    Drawer: ({ children, opened }: { children?: ReactNode; opened?: boolean }) =>
      opened ? <div>{children}</div> : null,
    FileButton: ({
      accept,
      children,
      onChange,
    }: {
      accept?: string;
      children: (props: Record<string, unknown>) => ReactNode;
      onChange?: (file: File | null) => void;
    }) => {
      const label = accept?.includes('image') ? 'Upload image' : 'Upload MP3';

      return (
        <label>
          <input
            aria-label={label}
            type='file'
            accept={accept}
            onChange={(event) => onChange?.(event.currentTarget.files?.[0] ?? null)}
          />
          {children({})}
        </label>
      );
    },
    Flex: renderChildren,
    Group: renderChildren,
    Loader: () => <div>Loading</div>,
    MantineProvider: renderChildren,
    Progress: ({ value }: { value?: number }) => <div>{value ?? 0}</div>,
    SegmentedControl: ({
      data,
      disabled,
      onChange,
      value,
    }: {
      data?: Array<{ label?: ReactNode; value: string }>;
      disabled?: boolean;
      onChange?: (value: string) => void;
      value?: string;
    }) => (
      <div>
        {data?.map((option) => (
          <button
            disabled={disabled}
            key={option.value}
            type='button'
            aria-pressed={option.value === value}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    ),
    Tabs: Object.assign(renderChildren, {
      List: renderChildren,
      Panel: renderChildren,
      Tab: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
    }),
    Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    Textarea: ({
      onChange,
      placeholder,
      value,
    }: {
      onChange?: (event: { target: { value: string } }) => void;
      placeholder?: string;
      value?: string;
    }) => <textarea placeholder={placeholder} value={value} onChange={(event) => onChange?.(event as never)} />,
    TextInput: ({
      onChange,
      placeholder,
      value,
    }: {
      onChange?: (event: { target: { value: string } }) => void;
      placeholder?: string;
      value?: string;
    }) => <input placeholder={placeholder} value={value} onChange={(event) => onChange?.(event as never)} />,
    Title: ({ children }: { children?: ReactNode }) => <h1>{children}</h1>,
    createTheme: (theme: unknown) => theme,
  };
});

vi.mock('@mantine/dropzone', () => {
  const Dropzone = Object.assign(
    ({
      'aria-label': ariaLabel,
      children,
      disabled,
      onDrop,
    }: {
      'aria-label'?: string;
      children?: ReactNode;
      disabled?: boolean;
      onDrop?: (files: File[]) => void;
    }) => (
      <div>
        <input
          aria-label={ariaLabel}
          disabled={disabled}
          type='file'
          onChange={(event) => onDrop?.(Array.from(event.currentTarget.files ?? []))}
        />
        {children}
      </div>
    ),
    {
      Accept: () => null,
      Idle: renderChildren,
      Reject: () => null,
    },
  );

  return { Dropzone };
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'alert', {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: () => 'blob:test',
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: () => undefined,
});
