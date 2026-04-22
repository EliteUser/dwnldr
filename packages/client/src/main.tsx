import { ThemeProvider, ToasterComponent, ToasterProvider } from '@gravity-ui/uikit';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';

import { App } from './app';
import { store } from './store';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import './theme.scss';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme='dark'>
        <ToasterProvider toaster={toaster}>
          <App />
          <ToasterComponent />
        </ToasterProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
