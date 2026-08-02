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
  const wasControlled = Boolean(navigator.serviceWorker.controller);

  void navigator.serviceWorker
    .getRegistrations()
    .then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if (wasControlled && registrations.length > 0) {
        window.location.reload();
      }
    })
    .catch(() => undefined);
}
