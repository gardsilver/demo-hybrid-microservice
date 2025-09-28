import { IGeneralAsyncContext } from 'src/modules/common';

export interface IKafkaAsyncContext extends IGeneralAsyncContext {
  replyTopic?: string;
  replyPartition?: number;
}
