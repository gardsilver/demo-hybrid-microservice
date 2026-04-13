import { RabbitMqFormatterHelper } from '../helpers/rabbit-mq.formatter.helper';
import { IRabbitMqUrl, IRMQErrorInfo } from '../types/types';

export interface IRabbitMqErrorData {
  serverName: string;
  url?: IRabbitMqUrl;
  eventType?: string;
}

export class RabbitMqError extends Error {
  constructor(
    message: string | undefined,
    public readonly data: IRabbitMqErrorData,
    cause?: unknown,
  ) {
    super(message === undefined ? 'RabbitMq Unknown Error' : message);
    this.name = 'RabbitMq Error';

    if (cause) {
      this.cause = cause;
    }
  }

  public static buildFromRMQErrorInfo(serverName: string, eventType: string, errorInfo: IRMQErrorInfo): RabbitMqError {
    return new RabbitMqError(
      errorInfo?.err?.message,
      {
        serverName,
        eventType,
        url: errorInfo?.url ? RabbitMqFormatterHelper.parseUrl(errorInfo.url) : undefined,
      },
      errorInfo?.err,
    );
  }
}
