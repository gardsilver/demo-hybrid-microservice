import { Metadata, StatusBuilder, status as GrpcStatus } from '@grpc/grpc-js';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { IHeaders } from 'src/modules/common';
import { ElkLoggerConfig, IUnknownFormatter } from 'src/modules/elk-logger';
import { UnknownFormatter } from 'src/modules/elk-logger/formatters/objects/unknown-formatter';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { MockObjectFormatter } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { RpcExceptionFormatter } from './rpc-exception.object-formatter';

describe(RpcExceptionFormatter.name, () => {
  let headers: IHeaders;
  let metadata: Metadata;
  let unknownFormatter: IUnknownFormatter;
  let formatter: RpcExceptionFormatter;

  beforeEach(async () => {
    const configService = new MockConfigService() as undefined as ConfigService;
    const loggerConfig = new ElkLoggerConfig(configService, [Metadata], []);
    unknownFormatter = new UnknownFormatter(loggerConfig, [new MockObjectFormatter()]);
    formatter = new RpcExceptionFormatter();
    formatter.setUnknownFormatter(unknownFormatter);

    jest.spyOn(MockObjectFormatter.prototype, 'isInstanceOf').mockImplementation((obj) => obj instanceof Metadata);

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

    metadata = grpcMetadataFactory.build(headers);
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(new RpcException('Test Error'))).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(new RpcException('Test Error'))).toEqual({
      data: 'Test Error',
    });

    expect(
      formatter.transform(
        new RpcException(
          new StatusBuilder().withCode(GrpcStatus.NOT_FOUND).withDetails('Not Found').withMetadata(metadata).build(),
        ),
      ),
    ).toEqual({
      status: {
        code: GrpcStatus.NOT_FOUND,
        details: 'Not Found',
        metadata: {
          field: 'fieldName',
        },
      },
    });

    expect(
      formatter.transform(
        new RpcException(new StatusBuilder().withCode(GrpcStatus.NOT_FOUND).withDetails('Not Found').build()),
      ),
    ).toEqual({
      status: {
        code: GrpcStatus.NOT_FOUND,
        details: 'Not Found',
      },
    });

    expect(
      formatter.transform(
        new RpcException({
          message: 'Test Message',
          metadata: {
            status: 'ok',
          },
        }),
      ),
    ).toEqual({
      status: {
        message: 'Test Message',
        metadata: {
          status: 'ok',
        },
      },
    });
  });
});
