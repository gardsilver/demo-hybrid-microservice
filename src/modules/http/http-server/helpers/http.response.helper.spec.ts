import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { responseFactory } from 'tests/express-js';
import { HttpResponseHelper } from './http.response.helper';

describe(HttpResponseHelper.name, () => {
  it('addHeaders', async () => {
    const ts = {
      traceId: faker.string.uuid(),
      spanId: faker.string.uuid(),
      requestId: faker.string.uuid(),
      correlationId: faker.string.uuid(),
    };

    const headers = httpHeadersFactory.build(
      {},
      {
        transient: {
          ...ts,
        },
      },
    );

    const response = responseFactory.build({
      headers,
    });

    const copyHeaders = merge({}, headers);

    HttpResponseHelper.addHeaders(
      {
        customParam: ['1', '30'],
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: faker.string.uuid(),
      },
      response,
    );

    expect(copyHeaders).not.toEqual(headers);
    expect(headers).toEqual({
      ...copyHeaders,
      customParam: ['1', '30'],
    });
  });
});
