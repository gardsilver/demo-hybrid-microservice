import { IGeneralAsyncContext } from 'src/modules/common';
import { httpHeadersFactory, IBaseHeaders } from 'tests/modules/http/http-common';

export const grpcHeadersFactory = {
  build: (
    params?: IBaseHeaders,
    options?: { transient?: IGeneralAsyncContext & { useZipkin?: boolean; asArray?: boolean } },
  ): IBaseHeaders => {
    const tgt: IBaseHeaders = {};

    for (const [k, v] of Object.entries(httpHeadersFactory.build(params, options))) {
      if (Array.isArray(v)) {
        tgt[`${k}-bin`] = JSON.stringify(v);
      } else {
        tgt[k] = v;
      }
    }

    return tgt;
  },
};
