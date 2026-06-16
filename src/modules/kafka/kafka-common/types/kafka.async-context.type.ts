import { IGeneralAsyncContext } from 'src/modules/common/context';

export interface IKafkaAsyncContext extends IGeneralAsyncContext {
  replyTopic?: string;
  replyPartition?: number;
}
