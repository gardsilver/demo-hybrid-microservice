import { ArgumentsHost } from '@nestjs/common';
import { KafkaContext } from '../ctx-host/kafka.context';

export class KafkaServerHelper {
  public static isKafka(context: ArgumentsHost): boolean {
    if (context.getType() !== 'rpc') {
      return false;
    }

    return context.switchToRpc().getContext() instanceof KafkaContext;
  }
}
