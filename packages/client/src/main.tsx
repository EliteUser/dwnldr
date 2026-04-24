import { ThemeProvider, ToasterComponent, ToasterProvider } from '@gravity-ui/uikit';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { AppQueryProvider } from './api/query-provider';
import { App } from './app';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import './theme.scss';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppQueryProvider>
      <ThemeProvider theme='dark'>
        <ToasterProvider toaster={toaster}>
          <App />
          <ToasterComponent className='appToaster' mobile />
        </ToasterProvider>
      </ThemeProvider>
    </AppQueryProvider>
  </StrictMode>,
);
