import { faker } from '@faker-js/faker';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { AccessRoles, AuthStatus } from 'src/modules/auth';
import { COOKIE_HEADER_NAME, HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { requestFactory } from 'tests/express-js';
import { METADATA_ASYNC_CONTEXT_KEY, METADATA_AUTH_INFO_KEY } from '../types/constants';
import { HttpAuthInfo } from './http.auth-info';
import { HttpCookies } from './http.cookies';
import { HttpGeneralAsyncContext } from './http.general.async-context';

describe('Decorators', () => {
  class Test {
    public testAuth(@HttpAuthInfo() value) {
      return value;
    }
    public testGeneralAsyncContext(@HttpGeneralAsyncContext() value) {
      return value;
    }

    public testCookies(@HttpCookies() value) {
      return value;
    }
  }

  const getParamDecoratorFactory = (targetKey: string) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, targetKey);

    return args[Object.keys(args)[0]].factory;
  };

  const mockContext = (header: string) => {
    return {
      switchToHttp: () => {
        return {
          getRequest: () => {
            const request = requestFactory.build({
              headers: {
                [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: header,
                [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: header,
                [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: header,
                [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: header,
                [COOKIE_HEADER_NAME]: header,
              },
            });
            request[METADATA_ASYNC_CONTEXT_KEY] = {
              traceId: header,
              spanId: header,
              requestId: header,
              correlationId: header,
            };
            request[METADATA_AUTH_INFO_KEY] =
              header === 'Any token'
                ? {
                    status: AuthStatus.TOKEN_ABSENT,
                  }
                : {
                    status: AuthStatus.SUCCESS,
                    roles: [AccessRoles.USER],
                  };
            return request;
          },
        };
      },
    };
  };

  it(HttpAuthInfo.name, async () => {
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

  it(HttpCookies.name, async () => {
    const cookieHeader = 'foo=bar; user-name=%D0%9F%D0%B5%D1%82%D1%80';

    const factory = getParamDecoratorFactory('testCookies');

    expect(factory(null, mockContext(undefined))).toEqual({});
    expect(factory(null, mockContext(cookieHeader))).toEqual({
      foo: 'bar',
      'user-name': 'Петр',
    });
    expect(factory('foo', mockContext(cookieHeader))).toEqual('bar');
  });

  it(HttpGeneralAsyncContext.name, async () => {
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
