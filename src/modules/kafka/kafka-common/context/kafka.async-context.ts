import { AbstractAsyncContext } from 'src/modules/async-context';
import { IKafkaAsyncContext } from '../types/kafka.async-context.type';

export class KafkaAsyncContext extends AbstractAsyncContext<IKafkaAsyncContext> {
  public static instance = new KafkaAsyncContext();
}
