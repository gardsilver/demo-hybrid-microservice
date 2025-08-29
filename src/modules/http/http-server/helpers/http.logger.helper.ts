import { Request, Response } from 'express';
import { HttpStatus } from '@nestjs/common';
import { LogLevel } from 'src/modules/elk-logger';
import { HttHeadersHelper } from 'src/modules/http/http-common';

export class HttpLoggerHelper {
  static requestAsLogFormat(request: Request) {
    const headers = HttHeadersHelper.normalize(request.headers);

    return {
      method: request.method?.toLocaleLowerCase(),
      route: request.route,
      url: request.url,
      params: request.params,
      body: request.body,
      headers,
    };
  }

  static responseAsLogFormat(response: Response, data?: unknown) {
    const headers = HttHeadersHelper.normalize(response.getHeaders());

    return {
      statusCode: response.statusCode,
      headers,
      data,
    };
  }

  static httpStatusToLogLevel(status: HttpStatus): LogLevel {
    switch (status) {
      case HttpStatus.CREATED:
      case HttpStatus.OK:
      case HttpStatus.FOUND:
      case HttpStatus.ACCEPTED:
        return LogLevel.INFO;
      case HttpStatus.INTERNAL_SERVER_ERROR:
      case HttpStatus.CONFLICT:
      case HttpStatus.TOO_MANY_REQUESTS:
      case HttpStatus.SERVICE_UNAVAILABLE:
      case HttpStatus.GATEWAY_TIMEOUT:
        return LogLevel.ERROR;
      case HttpStatus.NOT_FOUND:
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNAUTHORIZED:
      case HttpStatus.PAYMENT_REQUIRED:
      case HttpStatus.FORBIDDEN:
      case HttpStatus.NOT_IMPLEMENTED:
      case HttpStatus.BAD_GATEWAY:
      case HttpStatus.HTTP_VERSION_NOT_SUPPORTED:
        return LogLevel.WARN;
      case HttpStatus.LOOP_DETECTED:
        return LogLevel.FATAL;
      default:
        return undefined;
    }
  }
}
