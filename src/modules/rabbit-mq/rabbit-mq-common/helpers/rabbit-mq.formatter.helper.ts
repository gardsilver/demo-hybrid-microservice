import { Options } from 'amqplib';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { IKeyValue } from 'src/modules/common';
import { RABBIT_MQ_DEFAULT_URL_PARAMS } from '../types/constants';
import { IRabbitMqUrl, IRMQErrorInfo } from '../types/types';

const REPLACE_VALUE = ' ***** ';
const IS_FULL_URL = new RegExp(`^\\S*://\\S+$`);

export abstract class RabbitMqFormatterHelper {
  public static errorInfoFormat(errorInfo?: IRMQErrorInfo): IKeyValue<unknown> | undefined {
    let url = errorInfo?.url;

    if (url && typeof url === 'object') {
      url = {
        ...url,
        username: url?.username ? REPLACE_VALUE : undefined,
        password: url?.password ? REPLACE_VALUE : undefined,
      };
    }

    return errorInfo
      ? {
          ...errorInfo,
          url,
        }
      : undefined;
  }

  public static parseUrl(url: string | RmqUrl | Options.Connect): IRabbitMqUrl {
    if (typeof url === 'string') {
      const provideUrl = new URL(IS_FULL_URL.test(url) ? url : `${RABBIT_MQ_DEFAULT_URL_PARAMS.protocol}://${url}`);

      return {
        protocol: provideUrl.protocol.substring(0, provideUrl.protocol.length - 1),
        hostname: provideUrl.hostname ? provideUrl.hostname : RABBIT_MQ_DEFAULT_URL_PARAMS.hostname,
        port: provideUrl.port ? Number(provideUrl.port) : RABBIT_MQ_DEFAULT_URL_PARAMS.port,
        vhost: provideUrl.pathname ? provideUrl.pathname : RABBIT_MQ_DEFAULT_URL_PARAMS.vhost,
      };
    }

    return {
      protocol: url.protocol ? url.protocol : RABBIT_MQ_DEFAULT_URL_PARAMS.protocol,
      hostname: url.hostname ? url.hostname : RABBIT_MQ_DEFAULT_URL_PARAMS.hostname,
      port: url.port ? Number(url.port) : RABBIT_MQ_DEFAULT_URL_PARAMS.port,
      vhost: url.vhost ? url.vhost : RABBIT_MQ_DEFAULT_URL_PARAMS.vhost,
    };
  }
}
