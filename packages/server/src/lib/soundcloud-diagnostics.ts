import { getErrorStatus } from '../errors/error-utils.js';
import { getLogger } from './logger.js';

let hasLoggedInvalidClientId = false;

export const logInvalidSoundCloudClientIdOnce = (error: unknown, bindings?: Record<string, unknown>) => {
  const status = getErrorStatus(error);

  if (status !== 401 && status !== 403) {
    return false;
  }

  if (hasLoggedInvalidClientId) {
    return false;
  }

  hasLoggedInvalidClientId = true;

  getLogger(bindings).error(
    {
      evt: 'sc.client_id.invalid',
      statusCode: status,
    },
    'SoundCloud rejected the embedded client_id. Restart the server to refresh it.',
  );

  return true;
};

export const resetSoundCloudDiagnosticsForTests = () => {
  hasLoggedInvalidClientId = false;
};
