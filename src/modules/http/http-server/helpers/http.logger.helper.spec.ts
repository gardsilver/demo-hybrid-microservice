import { Request, Response } from 'express';
import { merge } from 'ts-deepmerge';
import { HttpStatus } from '@nestjs/common';
import { IHeaders, enumKeys } from 'src/modules/common';
import { LogLevel } from 'src/modules/elk-logger';
import { HttHeadersHelper } from 'src/modules/http/http-common';
import { requestFactory, responseFactory } from 'tests/express';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpLoggerHelper } from './http.logger.helper';

describe(HttpLoggerHelper.name, () => {
  const requestData = {
    data: {
      query: 'Петр',
    },
  };

  const responseData = {
    data: {
      status: 'Ok',
    },
  };

  let headers: IHeaders;
  let request: Request;
  let response: Response;

  beforeEach(async () => {
    headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
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

    request = requestFactory.build({
      method: 'GET',
      route: 'api/test',
      url: 'api/test',
      params: {},
      headers,
      body: requestData,
    });

    response = responseFactory.build({
      headers,
    });
  });

  it('requestAsLogFormat', async () => {
    const copyRequest = merge({}, request);

    expect(HttpLoggerHelper.requestAsLogFormat(request)).toEqual({
      method: 'get',
      route: request.route,
      url: request.url,
      params: request.params,
      body: request.body,
      headers: HttHeadersHelper.normalize(headers),
    });
    expect(copyRequest).toEqual(request);
  });

  it('responseAsLogFormat', async () => {
    const copyResponse = merge({}, response);

    expect(HttpLoggerHelper.responseAsLogFormat(response, responseData)).toEqual({
      statusCode: 500,
      headers: HttHeadersHelper.normalize(headers),
      data: responseData,
    });
    expect(copyResponse).toEqual(response);
  });

  it('httpStatusToLogLevel', async () => {
    const map = {
      [HttpStatus.OK]: LogLevel.INFO,
      [HttpStatus.CREATED]: LogLevel.INFO,
      [HttpStatus.ACCEPTED]: LogLevel.INFO,
      [HttpStatus.FOUND]: LogLevel.INFO,
      [HttpStatus.BAD_REQUEST]: LogLevel.WARN,
      [HttpStatus.UNAUTHORIZED]: LogLevel.WARN,
      [HttpStatus.PAYMENT_REQUIRED]: LogLevel.WARN,
      [HttpStatus.FORBIDDEN]: LogLevel.WARN,
      [HttpStatus.NOT_FOUND]: LogLevel.WARN,
      [HttpStatus.CONFLICT]: LogLevel.ERROR,
      [HttpStatus.TOO_MANY_REQUESTS]: LogLevel.ERROR,
      [HttpStatus.INTERNAL_SERVER_ERROR]: LogLevel.ERROR,
      [HttpStatus.NOT_IMPLEMENTED]: LogLevel.WARN,
      [HttpStatus.BAD_GATEWAY]: LogLevel.WARN,
      [HttpStatus.SERVICE_UNAVAILABLE]: LogLevel.ERROR,
      [HttpStatus.GATEWAY_TIMEOUT]: LogLevel.ERROR,
      [HttpStatus.HTTP_VERSION_NOT_SUPPORTED]: LogLevel.WARN,
      [HttpStatus.LOOP_DETECTED]: LogLevel.FATAL,
    };

    enumKeys(HttpStatus).forEach((status) => {
      expect(HttpLoggerHelper.httpStatusToLogLevel(HttpStatus[status])).toEqual(map[HttpStatus[status]]);
    });
  });
});
