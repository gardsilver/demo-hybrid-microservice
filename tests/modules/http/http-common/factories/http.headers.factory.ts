import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { IHeaders } from 'src/modules/common';
import { IGeneralAsyncContext } from 'src/modules/common/context';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';

export interface IBaseHeaders {
  [key: string]: string | string[];
}

export const httpHeadersFactory = Factory.define<IBaseHeaders, IGeneralAsyncContext>(({ transientParams }) => {
  const tgt: IHeaders = {};

  if ('traceId' in transientParams) {
    const value = transientParams.traceId ?? faker.string.hexadecimal({ length: 32, casing: 'lower', prefix: '' });

    tgt[HttpGeneralAsyncContextHeaderNames.TRACE_ID] = value;
  }

  if ('spanId' in transientParams) {
    const value = transientParams.spanId ?? faker.string.hexadecimal({ length: 16, casing: 'lower', prefix: '' });
    tgt[HttpGeneralAsyncContextHeaderNames.SPAN_ID] = value;
  }

  if ('requestId' in transientParams) {
    tgt[HttpGeneralAsyncContextHeaderNames.REQUEST_ID] = transientParams.requestId ?? faker.string.uuid();
  }

  if ('correlationId' in transientParams) {
    tgt[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID] = transientParams.correlationId ?? faker.string.uuid();
  }

  if (transientParams?.asArray) {
    for (const key of Object.keys(tgt)) {
      if (typeof tgt[key] === 'string') {
        tgt[key] = tgt[key].split('-');
      }
    }
  }

  return {
    ...tgt,
  };
});
