import { BaseHeadersHelper, IHeaders, IKeyValue } from 'src/modules/common';

export abstract class GrpcHeadersHelper {
  public static normalize<H extends object = IKeyValue>(headers: H): IHeaders {
    const tgt: IHeaders = {};

    for (const [k, v] of Object.entries(BaseHeadersHelper.normalize(headers))) {
      if (k.endsWith('-bin')) {
        tgt[k.slice(0, -4)] = JSON.parse(v as unknown as string);
      } else {
        tgt[k] = v;
      }
    }

    return tgt;
  }
}
