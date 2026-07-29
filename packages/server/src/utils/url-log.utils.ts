export const getSafeUrlLogFields = (input: string) => {
  try {
    const url = new URL(input);

    return {
      remoteHost: url.hostname,
      remotePath: url.pathname,
      remoteProtocol: url.protocol,
    };
  } catch {
    return {
      remoteUrlValid: false,
    };
  }
};
