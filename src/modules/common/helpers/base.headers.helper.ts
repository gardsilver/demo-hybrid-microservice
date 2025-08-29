import { IKeyValue, IHeaders } from '../types/types';

export class BaseHeadersHelper {
  public static normalize<H = IKeyValue>(headers: H): IHeaders {
    const tgt: IHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      if (v === undefined) {
        continue;
      }

      if (Array.isArray(v)) {
        tgt[k.toString().toLocaleLowerCase().trim()] = v.map((hv) => hv?.toString()?.trim());

        continue;
      }

      tgt[k.toString().toLocaleLowerCase().trim()] = v?.toString()?.trim();
    }

    return tgt;
  }

  public static searchValue(
    headers: IHeaders,
    ...headerName: string[]
  ): {
    header: string;
    value: string | string[];
  } {
    return headerName.reduce(
      (result, useHeaderName) => {
        if (result.value !== undefined || !(useHeaderName in headers)) {
          return result;
        }

        const value = headers[useHeaderName];

        if (Array.isArray(value)) {
          return {
            header: useHeaderName,
            value: value.length ? value : undefined,
          };
        }

        return {
          header: useHeaderName,
          value: value !== '' ? value : undefined,
        };
      },
      {
        header: undefined,
        value: undefined,
      },
    );
  }
}
