import { BaseRpcContext } from '@nestjs/microservices';
import { Consumer, KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { ConsumerMode, IKafkaMessageOptions } from '../types/types';

type KafkaContextArgs = [
  message: KafkaMessage | KafkaMessage[],
  partition: number,
  topic: string,
  consumer: Consumer,
  heartbeat: () => Promise<void>,
  mode: ConsumerMode,
  messageOptions: IKafkaMessageOptions | IKafkaMessageOptions[],
];

export class KafkaContext extends BaseRpcContext<KafkaContextArgs> {
  constructor(args: KafkaContextArgs) {
    super(args);
  }

  getMessage() {
    return this.args[0];
  }

  getPartition() {
    return this.args[1];
  }

  getTopic() {
    return this.args[2];
  }

  getConsumer() {
    return this.args[3];
  }

  getHeartbeat() {
    return this.args[4];
  }

  getMode() {
    return this.args[5];
  }

  getMessageOptions() {
    return this.args[6];
  }
}
