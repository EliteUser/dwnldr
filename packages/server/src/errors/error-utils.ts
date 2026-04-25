export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };

  const status = candidate.statusCode ?? candidate.status ?? candidate.response?.status;

  return typeof status === 'number' ? status : undefined;
};

export const isEnospcError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOSPC';

export const isAbortError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
