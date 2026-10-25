import { IHeaders, BaseHeadersHelper } from 'src/modules/common';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME } from '../types/security.constants';

export abstract class HttpAuthHelper {
  public static token(headers: IHeaders): string | undefined {
    let rawTokenStr: string | undefined;

    const { value: authToken } = BaseHeadersHelper.searchValue(headers, AUTHORIZATION_HEADER_NAME);

    if (typeof authToken === 'string' && authToken.trim() !== '') {
      rawTokenStr = authToken.trim();
    }

    if (!rawTokenStr) {
      const { value: cookieHeader } = BaseHeadersHelper.searchValue(headers, 'cookie');

      if (typeof cookieHeader === 'string' && cookieHeader !== '') {
        const regex = new RegExp(`(?:^|;\\s*)${AUTHORIZATION_HEADER_NAME}=([^;]*)`);
        const match = cookieHeader.match(regex);

        if (match?.[1]) {
          try {
            rawTokenStr = decodeURIComponent(match[1]).trim();
          } catch {
            // Некорректное cookie-значение считаем отсутствующим токеном.
            return undefined;
          }
        }
      }
    }

    if (!rawTokenStr) {
      return undefined;
    }

    const bearerPrefix = `${BEARER_NAME} `;

    if (rawTokenStr.startsWith(bearerPrefix)) {
      rawTokenStr = rawTokenStr.slice(bearerPrefix.length).trim();
    }

    return rawTokenStr || undefined;
  }
}
