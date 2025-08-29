import { Request } from 'express';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IGeneralAsyncContext } from 'src/modules/common';
import { HttpRequestHelper } from '../helpers/http.request.helper';

export const HttpGeneralAsyncContext = createParamDecorator(
  (data: string, ctx: ExecutionContext): IGeneralAsyncContext => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request);
  },
);
