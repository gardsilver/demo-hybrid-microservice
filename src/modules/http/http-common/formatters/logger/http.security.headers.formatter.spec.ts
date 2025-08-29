import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { ElkLoggerConfig } from 'src/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { COOKIE_HEADER_NAME, AUTHORIZATION_HEADER_NAME } from '../../types/security.constants';
import { HttpSecurityHeadersFormatter } from './http.security.headers.formatter';

describe(HttpSecurityHeadersFormatter.name, () => {
  let formatter: HttpSecurityHeadersFormatter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ElkLoggerConfig,
          useValue: new ElkLoggerConfig(new MockConfigService() as undefined as ConfigService, [], []),
        },
        HttpSecurityHeadersFormatter,
      ],
    }).compile();

    formatter = module.get(HttpSecurityHeadersFormatter);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(formatter).toBeDefined();
    expect(formatter.priority()).toEqual(0);
  });

  it('transform', async () => {
    const useAuthorizationName = AUTHORIZATION_HEADER_NAME.toString().toUpperCase();

    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
        [useAuthorizationName]: faker.string.alpha(20),
        [COOKIE_HEADER_NAME]: [faker.string.alpha(20)],
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
    const date = new DateTimestamp();

    const logRecord = logRecordFactory.build({
      payload: {
        headers,
        request: {
          headers,
        },
        response: {
          data: {
            date,
            status: 'ok',
          },
        },
        data: {
          headers,
          body: {
            programs: [12, 3, 17],
          },
        },
      },
    });

    const copyLogRecord = merge({}, logRecord);

    const formatHeaders = {
      ...headers,
      [useAuthorizationName]: ' ***** ',
      [COOKIE_HEADER_NAME]: [' ***** '],
    };

    const result = formatter.transform(logRecord);

    expect(copyLogRecord).toEqual(logRecord);
    expect(result.payload).toEqual({
      headers: formatHeaders,
      request: {
        headers: formatHeaders,
      },
      response: {
        data: {
          date,
          status: 'ok',
        },
      },
      data: {
        headers: formatHeaders,
        body: {
          programs: [12, 3, 17],
        },
      },
    });
    expect({
      ...result,
      payload: undefined,
    }).toEqual({
      ...logRecord,
      payload: undefined,
    });
  });
});
