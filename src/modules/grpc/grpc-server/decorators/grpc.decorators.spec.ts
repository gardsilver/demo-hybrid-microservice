import { faker } from '@faker-js/faker';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { AccessRoles, AuthStatus } from 'src/modules/auth';
import { METADATA_ASYNC_CONTEXT_KEY, METADATA_AUTH_INFO_KEY } from 'src/modules/http/http-server';
import { grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { GrpcAuthInfo } from './grpc.auth-info';
import { GrpcGeneralAsyncContext } from './grpc.general.async-context';

describe('Decorators', () => {
  class Test {
    public testAuth(@GrpcAuthInfo() value) {
      return value;
    }
    public testGeneralAsyncContext(@GrpcGeneralAsyncContext() value) {
      return value;
    }
  }

  const getParamDecoratorFactory = (targetKey: string) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, targetKey);

    return args[Object.keys(args)[0]].factory;
  };

  const mockContext = (header: string) => {
    return {
      switchToRpc: () => {
        return {
          getContext: () => {
            const headers = httpHeadersFactory.build(
              {
                programsIds: ['1', '30'],
              },
              {
                transient: {
                  traceId: header,
                  spanId: header,
                  requestId: header,
                  correlationId: header,
                },
              },
            );

            const grpcRequest = grpcMetadataFactory.build(headers);

            grpcRequest[METADATA_ASYNC_CONTEXT_KEY] = {
              traceId: header,
              spanId: header,
              requestId: header,
              correlationId: header,
            };
            grpcRequest[METADATA_AUTH_INFO_KEY] =
              header === 'Any token'
                ? {
                    status: AuthStatus.TOKEN_ABSENT,
                  }
                : {
                    status: AuthStatus.SUCCESS,
                    roles: [AccessRoles.USER],
                  };
            return grpcRequest;
          },
        };
      },
    };
  };

  it(GrpcAuthInfo.name, async () => {
    const token = faker.string.uuid();

    const factory = getParamDecoratorFactory('testAuth');

    expect(factory(null, mockContext('Any token'))).toEqual({
      status: 'tokenAbsent',
    });
    expect(factory(null, mockContext(token))).toEqual({
      status: 'success',
      roles: ['user'],
    });
  });

  it(GrpcGeneralAsyncContext.name, async () => {
    const factory = getParamDecoratorFactory('testGeneralAsyncContext');
    const mock = faker.string.uuid();

    expect(factory(null, mockContext(mock))).toEqual({
      traceId: mock,
      spanId: mock,
      requestId: mock,
      correlationId: mock,
    });
  });
});
