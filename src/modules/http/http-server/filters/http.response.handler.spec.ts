import { Request, Response } from 'express';
import { ExecutionContext, HttpStatus, HttpException, BadRequestException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { IGeneralAsyncContext, IHeaders, LoggerMarkers } from 'src/modules/common';
import {
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ElkLoggerModule,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ILogFields,
} from 'src/modules/elk-logger';
import {
  HttHeadersHelper,
  HttpHeadersToAsyncContextAdapter,
  IHttpHeadersToAsyncContextAdapter,
} from 'src/modules/http/http-common';
import { requestFactory, responseFactory } from 'tests/express';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { MockConfigService } from 'tests/nestjs';
import { HttpResponseHandler } from './http.response.handler';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';

describe(HttpResponseHandler.name, () => {
  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let headers: IHeaders;
  let request: Request;
  let response: Response;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let host: ExecutionContext;
  let headersAdapter: IHttpHeadersToAsyncContextAdapter;
  let responseHandler: HttpResponseHandler;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot()],
      providers: [
        {
          provide: HTTP_SERVER_HEADERS_ADAPTER_DI,
          useClass: HttpHeadersToAsyncContextAdapter,
        },
        HttpResponseHandler,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    await module.init();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    headersAdapter = module.get(HTTP_SERVER_HEADERS_ADAPTER_DI);
    responseHandler = module.get(HttpResponseHandler);

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

    asyncContext = headersAdapter.adapt(HttHeadersHelper.normalize(headers));

    request = requestFactory.build({
      method: 'get',
      route: 'api/test',
      params: {},
      headers,
      body: requestData,
    });

    response = responseFactory.build({
      status: HttpStatus.OK,
      headers,
    });

    host = {
      getType: () => 'http',
      getClass: () => 'TestHttpController',
      getHandler: jest.fn(),
      switchToHttp: () =>
        ({
          getRequest: () => request,
          getResponse: () => response,
          getNext: jest.fn(),
        }) as undefined as HttpArgumentsHost,
    } as undefined as ExecutionContext;

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(responseHandler).toBeDefined();
  });

  describe('handleError', () => {
    it('default', async () => {
      const error = new Error('Test error');
      const fieldsLogs: ILogFields = {
        module: 'My Module',
      };

      jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => {
        return asyncContext;
      });
      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(host, error, fieldsLogs);

      expect(HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request)).toEqual(asyncContext);
      expect(result instanceof HttpException).toBeTruthy();
      expect(result.getStatus()).toBe(500);

      expect(spyLoggingResponse).toHaveBeenCalledWith(500, {
        ...fieldsLogs,
        traceId: asyncContext.traceId,
        spanId: asyncContext.spanId,
        parentSpanId: asyncContext.parentSpanId,
        initialSpanId: asyncContext.initialSpanId,
        businessData: {},
        markers: [],
        payload: {
          request: {
            method: request.method?.toLocaleLowerCase(),
            route: request.route,
            url: request.url,
            params: request.params,
            body: request.body,
            headers: HttHeadersHelper.normalize(request.headers),
          },
          response: {
            statusCode: 500,
            headers: HttHeadersHelper.normalize(request.headers),
            data: 'Internal Server Error',
          },
          exception: error,
          error: result,
        },
      });
    });

    it('HttpException', async () => {
      const error = new BadRequestException('Test error');

      const spyAdapt = jest.spyOn(headersAdapter, 'adapt');
      HttpRequestHelper.setAsyncContext(asyncContext, request);

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(host, error);

      expect(spyAdapt).toHaveBeenCalledTimes(0);
      expect(result).toEqual(error);
      expect(spyLoggingResponse).toHaveBeenCalledWith(400, {
        traceId: asyncContext.traceId,
        spanId: asyncContext.spanId,
        parentSpanId: asyncContext.parentSpanId,
        initialSpanId: asyncContext.initialSpanId,
        businessData: {},
        markers: [],
        payload: {
          request: {
            method: request.method?.toLocaleLowerCase(),
            route: request.route,
            url: request.url,
            params: request.params,
            body: request.body,
            headers: HttHeadersHelper.normalize(request.headers),
          },
          response: {
            statusCode: 400,
            headers: HttHeadersHelper.normalize(request.headers),
            data: {
              error: 'Bad Request',
              message: 'Test error',
              statusCode: 400,
            },
          },
          error: result,
        },
      });
    });
  });

  describe('loggingResponse', () => {
    it('success', async () => {
      const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogger = jest.spyOn(logger, 'info');

      const fieldsLogs: ILogFields = {
        markers: [LoggerMarkers.INTERNAL],
        payload: {
          request: {
            method: request.method?.toLocaleLowerCase(),
            route: request.route,
            url: request.url,
            params: request.params,
            body: request.body,
            headers: HttHeadersHelper.normalize(request.headers),
          },
        },
      };

      responseHandler.loggingResponse(200, fieldsLogs);

      expect(spyLoggerBuilder).toHaveBeenCalledWith({
        module: 'HttpResponseHandler',
        ...fieldsLogs,
      });

      expect(spyLogger).toHaveBeenCalledWith('Response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS],
      });
    });

    it('error', async () => {
      const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogger = jest.spyOn(logger, 'error');

      const fieldsLogs: ILogFields = {
        module: 'My Module',
        markers: [LoggerMarkers.INTERNAL],
        payload: {
          request: {
            method: request.method?.toLocaleLowerCase(),
            route: request.route,
            url: request.url,
            params: request.params,
            body: request.body,
            headers: HttHeadersHelper.normalize(request.headers),
          },
        },
      };

      responseHandler.loggingResponse(500, fieldsLogs);

      expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);

      expect(spyLogger).toHaveBeenCalledWith('Response error', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR],
      });
    });

    it('warn', async () => {
      const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogger = jest.spyOn(logger, 'warn');

      const fieldsLogs: ILogFields = {
        module: 'My Module',
        markers: [LoggerMarkers.INTERNAL],
        payload: {
          request: {
            method: request.method?.toLocaleLowerCase(),
            route: request.route,
            url: request.url,
            params: request.params,
            body: request.body,
            headers: HttHeadersHelper.normalize(request.headers),
          },
        },
      };

      responseHandler.loggingResponse(404, fieldsLogs);

      expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);

      expect(spyLogger).toHaveBeenCalledWith('Response bad', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.BAD],
      });
    });

    it('fatal', async () => {
      const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogger = jest.spyOn(logger, 'fatal');

      const fieldsLogs: ILogFields = {
        module: 'My Module',
        markers: [LoggerMarkers.INTERNAL],
        payload: {
          request: {
            method: request.method?.toLocaleLowerCase(),
            route: request.route,
            url: request.url,
            params: request.params,
            body: request.body,
            headers: HttHeadersHelper.normalize(request.headers),
          },
        },
      };

      responseHandler.loggingResponse(508, fieldsLogs);

      expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);

      expect(spyLogger).toHaveBeenCalledWith('Response failed', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.FAILED],
      });
    });

    it('unknown', async () => {
      const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogger = jest.spyOn(logger, 'warn');

      const fieldsLogs: ILogFields = {
        module: 'My Module',
        markers: [LoggerMarkers.INTERNAL],
        payload: {
          request: {
            method: request.method?.toLocaleLowerCase(),
            route: request.route,
            url: request.url,
            params: request.params,
            body: request.body,
            headers: HttHeadersHelper.normalize(request.headers),
          },
        },
      };

      responseHandler.loggingResponse(100, fieldsLogs);

      expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);

      expect(spyLogger).toHaveBeenCalledWith('Response unknown', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.UNKNOWN],
      });
    });
  });
});
