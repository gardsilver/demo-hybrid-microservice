import { IHeaders, BaseHeadersHelper } from 'src/modules/common';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME } from '../types/security.constants';

export abstract class HttpAuthHelper {
  public static token(headers: IHeaders): string | undefined {
    let rawTokenStr: string | undefined;

    const { value: authToken } = BaseHeadersHelper.searchValue(headers, AUTHORIZATION_HEADER_NAME);
    if (authToken && typeof authToken === 'string' && authToken !== '') {
      rawTokenStr = authToken.trim();
    }

    if (!rawTokenStr) {
      const { value: cookieHeader } = BaseHeadersHelper.searchValue(headers, 'cookie');

      if (cookieHeader && typeof cookieHeader === 'string' && cookieHeader !== '') {
        const regex = new RegExp(`(?:^|; )${AUTHORIZATION_HEADER_NAME}=([^;]*)`);
        const match = cookieHeader.match(regex);

        if (match && match[1]) {
          rawTokenStr = decodeURIComponent(match[1]).trim();
        }
      }
    }

    if (rawTokenStr) {
      if (rawTokenStr.startsWith(`${BEARER_NAME} `)) {
        return rawTokenStr.replace(`${BEARER_NAME} `, '').trim();
      }
      return rawTokenStr;
    }

    return undefined;
  }
}
