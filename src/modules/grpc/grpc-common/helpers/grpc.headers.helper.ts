import { BaseHeadersHelper, IHeaders, IKeyValue } from 'src/modules/common';

export class GrpcHeadersHelper {
  public static normalize<H = IKeyValue>(headers: H): IHeaders {
    const tgt: IHeaders = {};

    for (const [k, v] of Object.entries(BaseHeadersHelper.normalize(headers))) {
      if (k.endsWith('-bin')) {
        tgt[k.slice(0, -4)] = JSON.parse(v as undefined as string);
      } else {
        tgt[k] = v;
      }
    }

    return tgt;
  }
}
