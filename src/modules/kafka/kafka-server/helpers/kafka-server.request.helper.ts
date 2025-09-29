import { IKafkaAsyncContext } from 'src/modules/kafka/kafka-common';
import { KafkaContext } from '../ctx-host/kafka.context';
import { METADATA_ASYNC_CONTEXT_KEY } from '../types/constants';

export class KafkaServerRequestHelper {
  public static setAsyncContext<Ctx = IKafkaAsyncContext>(ctx: Ctx, kafkaContext: KafkaContext) {
    kafkaContext[METADATA_ASYNC_CONTEXT_KEY] = ctx;
  }

  public static getAsyncContext<Ctx = IKafkaAsyncContext>(kafkaContext: KafkaContext): Ctx {
    return kafkaContext[METADATA_ASYNC_CONTEXT_KEY] as undefined as Ctx;
  }
}
