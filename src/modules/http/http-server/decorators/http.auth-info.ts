import { Request } from 'express';
import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { IAuthInfo } from 'src/modules/auth';
import { HttpRequestHelper } from '../helpers/http.request.helper';

export const HttpAuthInfo = createParamDecorator((data: string, ctx: ExecutionContext): IAuthInfo => {
  const request = ctx.switchToHttp().getRequest<Request>();

  return HttpRequestHelper.getAuthInfo(request);
});
