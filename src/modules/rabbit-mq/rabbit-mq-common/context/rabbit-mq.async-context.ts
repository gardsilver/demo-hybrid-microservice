import { AbstractAsyncContext } from 'src/modules/async-context';
import { IRabbitMqAsyncContext } from '../types/rabbit-mq.async-context.type';

export class RabbitMqAsyncContext extends AbstractAsyncContext<IRabbitMqAsyncContext> {
  public static instance = new RabbitMqAsyncContext();
}
