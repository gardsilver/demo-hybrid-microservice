import { IHeaders, BaseHeadersHelper } from 'src/modules/common';
import { BEARER_NAME, AUTHORIZATION_HEADER_NAME } from '../types/security.constants';

export class HttpAuthHelper {
  public static token(headers: IHeaders): string {
    const { value: authToken } = BaseHeadersHelper.searchValue(headers, AUTHORIZATION_HEADER_NAME);

    if (authToken && typeof authToken === 'string' && authToken.startsWith(`${BEARER_NAME} `)) {
      return authToken.replace(`${BEARER_NAME} `, '').trim();
    }

    return undefined;
  }
}
