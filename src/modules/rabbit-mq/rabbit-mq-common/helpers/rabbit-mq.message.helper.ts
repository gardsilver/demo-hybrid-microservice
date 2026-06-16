import { IHeaders, IKeyValue } from 'src/modules/common';
import { HttHeadersHelper, HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { IRabbitMqAsyncContext } from '../types/rabbit-mq.async-context.type';
import { IRabbitMqHeaders, IRabbitMqMessageProperties, RabbitMqHeadersValue } from '../types/types';
import { enumValues } from 'src/modules/common/utils';

export abstract class RabbitMqMessageHelper {
  protected static normalizeHeaderValue(value: unknown): RabbitMqHeadersValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      if (!value.length) {
        return undefined;
      }

      const normalized: RabbitMqHeadersValue[] = value
        .map((v) => RabbitMqMessageHelper.normalizeHeaderValue(v))
        .filter((v): v is RabbitMqHeadersValue => v !== undefined);

      return normalized.length ? normalized : undefined;
    }

    if (typeof value === 'object' && value !== null) {
      return RabbitMqMessageHelper.normalize(value);
    }

    if (typeof value === 'string') {
      return value.toString().trim();
    }

    return value as RabbitMqHeadersValue;
  }

  public static normalize<H extends object = IKeyValue>(headers: H): IRabbitMqHeaders {
    const tgt: IRabbitMqHeaders = {};

    for (const [k, v] of Object.entries(headers)) {
      const normalize = RabbitMqMessageHelper.normalizeHeaderValue(v);

      if (normalize === undefined) {
        continue;
      }

      tgt[k.toString().toLocaleLowerCase().trim()] = normalize;
    }

    return tgt;
  }

  protected static normalizeTraceSpanHeaders(rmqHeaders: IRabbitMqHeaders): IHeaders {
    const headers: IHeaders = {};

    if (!rmqHeaders) {
      return headers;
    }

    const targetKeys = enumValues(HttpGeneralAsyncContextHeaderNames);

    for (const headerName of targetKeys) {
      const rmqValue = RabbitMqMessageHelper.headerValueAsString(
        RabbitMqMessageHelper.searchValue(rmqHeaders, headerName as string).value,
      );

      if (rmqValue !== undefined) {
        headers[headerName as string] = rmqValue;
      }
    }

    return headers;
  }

  public static toAsyncContext<Ctx extends IRabbitMqAsyncContext>(properties: IRabbitMqMessageProperties): Ctx {
    const commonHeaders = RabbitMqMessageHelper.normalizeTraceSpanHeaders(properties.headers);
    const commonCtx: Ctx = HttHeadersHelper.toAsyncContext<Ctx>(commonHeaders);

    const ctx: Ctx = {
      ...commonCtx,
      correlationId: properties.correlationId ?? commonCtx.correlationId,
      messageId: properties.messageId,
      replyTo: properties.replyTo,
    } as unknown as Ctx;

    return ctx;
  }

  protected static headerValueAsString(value?: RabbitMqHeadersValue): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.length ? value.join('-') : undefined;
    }

    if (typeof value === 'object') {
      return undefined;
    }

    return value.toString().trim();
  }

  public static nameAsHeaderName(name: string): string | undefined {
    if (name === 'correlationId') {
      return undefined;
    }

    return HttHeadersHelper.nameAsHeaderName(name);
  }

  public static searchValue(
    headers: IRabbitMqHeaders,
    ...headerName: string[]
  ): {
    header: string | undefined;
    value: RabbitMqHeadersValue | undefined;
  } {
    const result = headerName.reduce<{
      header: string | undefined;
      value: RabbitMqHeadersValue | undefined;
    }>(
      (result, useHeaderName) => {
        if (result.value !== undefined || !(useHeaderName in headers)) {
          return result;
        }

        const value = headers[useHeaderName];

        if (value === undefined) {
          return {
            header: useHeaderName,
            value: undefined,
          };
        }

        if (Array.isArray(value)) {
          return {
            header: useHeaderName,
            value: value.length ? value : undefined,
          };
        }

        if (typeof value === 'object') {
          return {
            header: useHeaderName,
            value: Object.values(value).length ? value : undefined,
          };
        }

        return {
          header: useHeaderName,
          value,
        };
      },
      {
        header: undefined,
        value: undefined,
      },
    );

    return result;
  }

  public static searchHeaderAsString(headers: IRabbitMqHeaders, ...headerName: string[]): string | undefined {
    const result = RabbitMqMessageHelper.searchValue(headers, ...headerName);

    if (Array.isArray(result.value)) {
      result.value = result.value.length ? result.value.join('-') : undefined;
    }

    if (result.value === undefined || result.value === '') {
      return undefined;
    }

    return String(result.value);
  }
}
