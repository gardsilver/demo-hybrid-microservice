import { IGeneralAsyncContext } from 'src/modules/common';

export interface IRabbitMqAsyncContext extends IGeneralAsyncContext {
  messageId?: string;
  replyTo?: string;
}
