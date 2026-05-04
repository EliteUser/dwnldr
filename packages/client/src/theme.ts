import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontFamilyMonospace:
    "'Roboto Mono', Menlo, Monaco, Consolas, 'Ubuntu Mono', 'Liberation Mono', 'DejaVu Sans Mono', 'Courier New', monospace",
  headings: {
    fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontWeight: '600',
  },
  colors: {
    blue: [
      '#eff6ff',
      '#dbeafe',
      '#bfdbfe',
      '#93c5fd',
      '#60a5fa',
      '#3b82f6',
      '#2563eb',
      '#1d4ed8',
      '#1e40af',
      '#172554',
    ],
    dark: [
      '#f4f4f5',
      '#d4d4d8',
      '#a1a1aa',
      '#71717a',
      '#52525b',
      '#3f3f46',
      '#27272a',
      '#1f1f23',
      '#18181b',
      '#111113',
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'md',
        radius: 'md',
      },
      styles: {
        label: {
          paddingBlockEnd: '6px',
          paddingInlineStart: '4px',
        },
      },
    },
    Textarea: {
      defaultProps: {
        size: 'md',
        radius: 'md',
      },
      styles: {
        label: {
          paddingBlockEnd: '6px',
          paddingInlineStart: '4px',
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
      },
    },
    Notification: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
