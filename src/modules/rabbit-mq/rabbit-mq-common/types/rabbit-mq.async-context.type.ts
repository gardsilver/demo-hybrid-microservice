import { IGeneralAsyncContext } from 'src/modules/common/context';

export interface IRabbitMqAsyncContext extends IGeneralAsyncContext {
  messageId?: string;
  replyTo?: string;
}
