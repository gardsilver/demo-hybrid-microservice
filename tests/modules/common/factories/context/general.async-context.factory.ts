import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { IGeneralAsyncContext } from 'src/modules/common';

export const generalAsyncContextFactory = Factory.define<IGeneralAsyncContext>(({ transientParams }) => {
  const tgt = {} as IGeneralAsyncContext;

  for (const key of ['traceId', 'spanId', 'initialSpanId', 'parentSpanId', 'requestId', 'correlationId']) {
    if (key in transientParams) {
      tgt[key] = transientParams[key] === undefined ? faker.string.uuid() : transientParams[key];
    }
  }

  return {
    ...transientParams,
    ...tgt,
  };
});
