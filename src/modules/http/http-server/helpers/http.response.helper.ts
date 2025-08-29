import { Response } from 'express';
import { IHeaders } from 'src/modules/common';
import { HttHeadersHelper } from '../../http-common';

export class HttpResponseHelper {
  public static addHeaders(headers: IHeaders, response: Response): void {
    const resHeaders = HttHeadersHelper.normalize(response.getHeaders());

    for (const [k, v] of Object.entries(headers)) {
      if (k in resHeaders) {
        continue;
      }

      response.setHeader(k, v);
    }
  }
}
