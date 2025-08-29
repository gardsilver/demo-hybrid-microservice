import { faker } from '@faker-js/faker';
import { IHeaders } from 'src/modules/common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpAuthHelper } from './http.auth.helper';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME } from '../types/security.constants';
import { HttHeadersHelper } from './http.headers.helper';

describe(HttpAuthHelper.name, () => {
  let token: string;
  let headers: IHeaders;

  beforeEach(async () => {
    token = faker.string.alpha(20);
    headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
        [AUTHORIZATION_HEADER_NAME.toString().toUpperCase()]: BEARER_NAME + ' ' + token,
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    );
  });

  it('Без нормализации заголовков', async () => {
    expect(HttpAuthHelper.token(headers)).toBeUndefined();

    expect(
      HttpAuthHelper.token({
        ...headers,
        [AUTHORIZATION_HEADER_NAME.toString().toUpperCase()]: undefined,
      }),
    ).toBeUndefined();
  });

  it('C нормализацией заголовков', async () => {
    expect(HttpAuthHelper.token(HttHeadersHelper.normalize(headers))).toEqual(token);
  });
});
