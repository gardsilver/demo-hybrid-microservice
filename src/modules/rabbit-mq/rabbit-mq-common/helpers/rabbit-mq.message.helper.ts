import { IKeyValue } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttHeadersHelper, HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { IRabbitMqAsyncContext } from '../types/rabbit-mq.async-context.type';
import { IRabbitMqHeaders, IRabbitMqMessageProperties, RabbitMqHeadersValue } from '../types/types';

export abstract class RabbitMqMessageHelper {
  protected static normalizeHeaderValue(value: unknown): RabbitMqHeadersValue {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.length ? value.map((v) => RabbitMqMessageHelper.normalizeHeaderValue(v)) : undefined;
    }

    if (typeof value === 'object') {
      return RabbitMqMessageHelper.normalize(value);
    }

    if (typeof value === 'string') {
      return value.toString().trim();
    }

    return value as undefined as RabbitMqHeadersValue;
  }

  public static normalize<H = IKeyValue>(headers: H): IRabbitMqHeaders {
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

  public static toAsyncContext<Ctx extends IRabbitMqAsyncContext>(properties: IRabbitMqMessageProperties): Ctx {
    const traceId =
      RabbitMqMessageHelper.headerValueAsString(
        RabbitMqMessageHelper.searchValue(
          properties.headers,
          HttpGeneralAsyncContextHeaderNames.TRACE_ID,
          HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
        ).value,
      ) ?? TraceSpanHelper.generateRandomValue();

    const parentSpanId = RabbitMqMessageHelper.headerValueAsString(
      RabbitMqMessageHelper.searchValue(
        properties.headers,
        HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID,
      ).value,
    );

    const ctx: Ctx = {
      traceId,
      spanId: TraceSpanHelper.generateRandomValue(),
      parentSpanId,
      initialSpanId: parentSpanId,
      requestId: RabbitMqMessageHelper.headerValueAsString(
        RabbitMqMessageHelper.searchValue(properties.headers, HttpGeneralAsyncContextHeaderNames.REQUEST_ID).value,
      ),
      correlationId: properties.correlationId,
      messageId: properties.messageId,
      replyTo: properties.replyTo,
    } as undefined as Ctx;

    return ctx;
  }

  protected static headerValueAsString(value?: RabbitMqHeadersValue): string {
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

  public static nameAsHeaderName(name: string, useZipkin?: boolean): string {
    if (name === 'correlationId') {
      return undefined;
    }

    return HttHeadersHelper.nameAsHeaderName(name, useZipkin);
  }

  public static searchValue(
    headers: IRabbitMqHeaders,
    ...headerName: string[]
  ): {
    header: string;
    value: RabbitMqHeadersValue;
  } {
    const result = headerName.reduce(
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

    if (
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID, HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID].includes(
        result.header as undefined as HttpGeneralAsyncContextHeaderNames,
      )
    ) {
      const asStr = RabbitMqMessageHelper.headerValueAsString(result.value);

      return {
        ...result,
        value: asStr ? TraceSpanHelper.formatToGuid(asStr) : undefined,
      };
    }

    return result;
  }
}
