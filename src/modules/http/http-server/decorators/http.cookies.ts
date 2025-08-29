// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookie = require('cookie');
import { Request } from 'express';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { COOKIE_HEADER_NAME, HttHeadersHelper } from 'src/modules/http/http-common';

export const HttpCookies = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const headers = HttHeadersHelper.normalize(request.headers);
  const parsedCookie = headers[COOKIE_HEADER_NAME] ? cookie.parse(headers[COOKIE_HEADER_NAME]) : {};

  return data ? parsedCookie[data] : parsedCookie;
});
