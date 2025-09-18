import { Metadata, StatusBuilder, status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { IHeaders } from 'src/modules/common';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { RpcExceptionFormatter } from './rpc-exception.object-formatter';
import { IUnknownFormatter } from 'src/modules/elk-logger';
import { MockUnknownFormatter } from 'tests/modules/elk-logger';

describe(RpcExceptionFormatter.name, () => {
  let headers: IHeaders;
  let metadata: Metadata;
  let unknownFormatter: IUnknownFormatter;
  let formatter: RpcExceptionFormatter;

  beforeEach(async () => {
    unknownFormatter = new MockUnknownFormatter();
    formatter = new RpcExceptionFormatter();
    formatter.setUnknownFormatter(unknownFormatter);

    jest.spyOn(unknownFormatter, 'transform').mockImplementation((value) => {
      if (value && value instanceof Metadata) {
        return GrpcHeadersHelper.normalize(value.getMap());
      }

      return value;
    });

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

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat('')).toBeFalsy();
    expect(formatter.canFormat({})).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeFalsy();
    expect(formatter.canFormat(new RpcException('Test Error'))).toBeTruthy();
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
      code: GrpcStatus.NOT_FOUND,
      details: 'Not Found',
      metadata: GrpcHeadersHelper.normalize(metadata.getMap()),
    });

    expect(
      formatter.transform(
        new RpcException(new StatusBuilder().withCode(GrpcStatus.NOT_FOUND).withDetails('Not Found').build()),
      ),
    ).toEqual({
      code: GrpcStatus.NOT_FOUND,
      details: 'Not Found',
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
      message: 'Test Message',
      metadata: {
        status: 'ok',
      },
    });
  });
});
