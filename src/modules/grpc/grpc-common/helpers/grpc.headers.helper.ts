/* eslint-disable  @typescript-eslint/no-explicit-any */
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

  /**
   * Публичный метод для интеллектуального парсинга паттерна gRPC из NestJS.
   * Перебирает все возможные варианты именования ключей (регистронезависимо),
   * возвращая красивую плоскую строку "ServiceName/MethodName".
   */
  public static parsePattern(pattern: unknown): string {
    if (pattern === undefined || pattern === null) {
      return 'Unknown/Unknown';
    }

    let serviceName = 'Unknown';
    let methodName = 'Unknown';

    if (typeof pattern === 'object' && pattern !== null) {
      const p = pattern as any;

      serviceName = p.service || p.rpcServices || p.rpcService || 'Unknown';
      methodName = p.rpc || p.method || p.Method || p.rpcMethods || p.rpcMethod || 'Unknown';
    } else {
      const strPattern = String(pattern);
      if (strPattern.includes('/')) {
        const parts = strPattern.split('/');
        serviceName = parts[parts.length - 2] || 'Unknown';
        methodName = parts[parts.length - 1] || 'Unknown';
      } else {
        methodName = strPattern;
      }
    }

    return `${serviceName}/${methodName}`;
  }
}
