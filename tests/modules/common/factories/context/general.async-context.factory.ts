import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { IGeneralAsyncContext } from 'src/modules/common';

export const generalAsyncContextFactory = Factory.define<IGeneralAsyncContext>(({ transientParams }) => {
  const tgt = {} as IGeneralAsyncContext;

  for (const key of ['traceId', 'spanId', 'initialSpanId', 'parentSpanId', 'requestId', 'correlationId']) {
    if (key in transientParams) {
      let mock: string;

      switch (key) {
        case 'traceId':
          mock = faker.string.hexadecimal({ length: 32, casing: 'lower', prefix: '' });
          break;
        case 'spanId':
        case 'initialSpanId':
        case 'parentSpanId':
          mock = faker.string.hexadecimal({ length: 16, casing: 'lower', prefix: '' });
          break;
        default:
          mock = faker.string.uuid();
          break;
      }

      tgt[key] = transientParams[key] === undefined ? mock : transientParams[key];
    }
  }

  return {
    ...transientParams,
    ...tgt,
  };
});
