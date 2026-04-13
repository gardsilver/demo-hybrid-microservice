export abstract class UrlHelper {
  public static getPort(provideUrl: URL): string | false {
    if (provideUrl.port?.length) {
      return provideUrl.port;
    }

    if (provideUrl.href.startsWith('https')) {
      return '443';
    }

    if (provideUrl.href.startsWith('http')) {
      return '80';
    }

    return false;
  }

  public static normalize(url: string): string | false {
    try {
      const provideUrl = new URL(url);
      const port = UrlHelper.getPort(provideUrl);

      if (port === false) {
        return false;
      }

      if (provideUrl.hostname?.length && port?.length) {
        return `${provideUrl.hostname}:${port}`;
      }

      return url;
    } catch {
      return false;
    }
  }

  public static parse(url: string): {
    hostname: string;
    pathname: string;
  } {
    try {
      const provideUrl = new URL(url);

      if (!provideUrl.hostname?.length) {
        throw new Error();
      }

      const fullHost = [provideUrl.hostname];

      const port = UrlHelper.getPort(provideUrl);

      if (port !== false && port.length) {
        fullHost.push(port);
      }

      return {
        hostname: fullHost.join(':'),
        pathname: provideUrl.pathname,
      };
    } catch {
      throw new Error(`Не корректный формат URI (${url})`);
    }
  }
}
