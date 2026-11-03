import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { queryClient } from './api';
import { App } from './components/app/app';
import { theme } from './theme';

import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} forceColorScheme='dark' defaultColorScheme='dark'>
        <App />
        <Notifications className='appNotifications' position='bottom-right' />
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
);
