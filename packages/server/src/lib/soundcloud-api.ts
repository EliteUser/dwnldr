import { getErrorStatus } from '../errors/error-utils.js';
import { SOUNDCLOUD_UNAUTHORIZED_MESSAGE, toSoundCloudHttpError } from '../errors/soundcloud-errors.js';
import { logTimedOperation } from './logger.js';
import { logInvalidSoundCloudClientIdOnce } from './soundcloud-diagnostics.js';

type SoundCloudApiCallOptions = {
  bindings?: Record<string, unknown>;
  failureEvt: string;
  failureMessage: string;
  fallbackMessage?: string;
  notFoundMessage?: string;
  startEvt: string;
  startMessage: string;
  successEvt: string;
  successMessage: string;
};

const isUnauthorizedSoundCloudError = (error: unknown) => {
  const status = getErrorStatus(error);

  return status === 401 || status === 403;
};

export const callSoundCloudApi = async <T>(options: SoundCloudApiCallOptions, operation: () => Promise<T>) =>
  logTimedOperation(
    {
      startEvt: options.startEvt,
      successEvt: options.successEvt,
      failureEvt: (error) => (isUnauthorizedSoundCloudError(error) ? 'sc.api.unauthorized' : options.failureEvt),
      startMessage: options.startMessage,
      successMessage: options.successMessage,
      failureMessage: (error) =>
        isUnauthorizedSoundCloudError(error) ? SOUNDCLOUD_UNAUTHORIZED_MESSAGE : options.failureMessage,
      bindings: options.bindings,
    },
    operation,
  ).catch((error: unknown) => {
    logInvalidSoundCloudClientIdOnce(error, options.bindings);
    throw toSoundCloudHttpError(error, {
      fallbackMessage: options.fallbackMessage,
      notFoundMessage: options.notFoundMessage,
    });
  });
