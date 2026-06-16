import { AbstractAsyncContext } from 'src/modules/async-context';
import { IKafkaAsyncContext } from '../types/kafka.async-context.type';

export class KafkaAsyncContext extends AbstractAsyncContext<IKafkaAsyncContext> {
  public static override instance = new KafkaAsyncContext();

  protected getTracerName(): string {
    return 'common-kafka-context';
  }
}
