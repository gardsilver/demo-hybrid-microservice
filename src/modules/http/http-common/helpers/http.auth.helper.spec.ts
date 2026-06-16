/* eslint-disable @typescript-eslint/no-explicit-any */
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
      } as unknown as IHeaders),
    ).toBeUndefined();
  });

  it('C нормализацией заголовков', async () => {
    expect(HttpAuthHelper.token(HttHeadersHelper.normalize(headers))).toEqual(token);
  });

  it('должен успешно извлекать токен из Cookies с префиксом Bearer и URL-декодированием', async () => {
    const rawCookieValue = encodeURIComponent(`${BEARER_NAME} ${token}`);

    const wsHeaders: IHeaders = HttHeadersHelper.normalize({
      cookie: `session_id=123; ${AUTHORIZATION_HEADER_NAME}=${rawCookieValue}; theme=dark`,
    } as any);

    const result = HttpAuthHelper.token(wsHeaders);

    expect(result).toEqual(token);
  });

  it('должен корректно извлекать токен из Cookies, если он записан без префикса Bearer', async () => {
    const wsHeaders: IHeaders = HttHeadersHelper.normalize({
      cookie: `some_cookie=val; ${AUTHORIZATION_HEADER_NAME}=${token}`,
    } as any);

    const result = HttpAuthHelper.token(wsHeaders);
    expect(result).toEqual(token);
  });

  it('должен вернуть undefined, если заголовок cookie присутствует, но целевая кука authorization не найдена или пуста', async () => {
    const wsHeadersWithOtherCookie: IHeaders = HttHeadersHelper.normalize({
      cookie: 'theme=dark; lang=ru',
    } as any);

    const wsHeadersWithEmptyCookie: IHeaders = HttHeadersHelper.normalize({
      cookie: `${AUTHORIZATION_HEADER_NAME}=`,
    } as any);

    expect(HttpAuthHelper.token(wsHeadersWithOtherCookie)).toBeUndefined();
    expect(HttpAuthHelper.token(wsHeadersWithEmptyCookie)).toBeUndefined();
  });
});
