import { connect, AmqpConnectionManager } from 'amqp-connection-manager';
import { RmqOptions } from '@nestjs/microservices';
import { AmqpConnectionManagerSocketOptions } from '@nestjs/microservices/external/rmq-url.interface';

export abstract class RabbitMqServerBuilder {
  public static build(options: {
    urls: NonNullable<RmqOptions['options']>['urls'];
    socketOptions?: AmqpConnectionManagerSocketOptions;
  }): AmqpConnectionManager {
    return connect(options.urls, {
      connectionOptions: options.socketOptions?.connectionOptions,
      heartbeatIntervalInSeconds: options.socketOptions?.heartbeatIntervalInSeconds,
      reconnectTimeInSeconds: options.socketOptions?.reconnectTimeInSeconds,
    });
  }
}
