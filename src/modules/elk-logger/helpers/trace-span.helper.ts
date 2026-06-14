import { randomUUID, randomBytes } from 'crypto';

export abstract class TraceSpanHelper {
  public static generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  public static generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  public static generateRandomValue(): string {
    return randomUUID();
  }

  public static formatToZipkin(value: string): string {
    return value.replace(/[^0-9a-fA-F]/gi, '').toLowerCase();
  }

  public static formatToGuid(value: string): string {
    const zipkin = TraceSpanHelper.formatToZipkin(value);

    return (
      zipkin.substring(0, 8) +
      '-' +
      zipkin.substring(8, 12) +
      '-' +
      zipkin.substring(12, 16) +
      '-' +
      zipkin.substring(16, 20) +
      '-' +
      zipkin.substring(20, 32)
    );
  }
}
