import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { AppQueryProvider } from './api/query-provider';
import { App } from './components';
import { theme } from './theme';

import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppQueryProvider>
      <MantineProvider theme={theme} forceColorScheme='dark' defaultColorScheme='dark'>
        <App />
        <Notifications className='appNotifications' position='bottom-right' />
      </MantineProvider>
    </AppQueryProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
