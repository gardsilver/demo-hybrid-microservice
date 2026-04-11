import { IKeyValue, IHeaders } from '../types/types';

export abstract class BaseHeadersHelper {
  public static normalize<H = IKeyValue>(headers: H): IHeaders {
    const tgt: IHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      if (v === undefined) {
        continue;
      }

      if (Array.isArray(v) && !Buffer.isBuffer(v)) {
        tgt[k.toString().toLocaleLowerCase().trim()] = v.map((hv) => hv?.toString()?.trim());

        continue;
      }

      const str = v?.toString()?.trim();
      if (str !== undefined) {
        tgt[k.toString().toLocaleLowerCase().trim()] = str;
      }
    }

    return tgt;
  }

  public static searchValue(
    headers: IHeaders,
    ...headerName: string[]
  ): {
    header: string | undefined;
    value: string | string[] | undefined;
  } {
    return headerName.reduce<{
      header: string | undefined;
      value: string | string[] | undefined;
    }>(
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
