import { ArgumentsHost } from '@nestjs/common';
import { RabbitMqContext } from '../ctx-host/rabbit-mq.context';

export abstract class RabbitMqHelper {
  public static isRabbitMq(context: ArgumentsHost): boolean {
    if (context.getType() !== 'rpc') {
      return false;
    }

    return context.switchToRpc().getContext() instanceof RabbitMqContext;
  }
}
