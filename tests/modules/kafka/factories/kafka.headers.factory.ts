import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { IHeaders } from 'src/modules/common';
import { IKafkaAsyncContext, KafkaAsyncContextHeaderNames } from 'src/modules/kafka/kafka-common';
import { httpHeadersFactory, IBaseHeaders } from 'tests/modules/http/http-common';

export interface IKafkaBaseHeaders extends IBaseHeaders {
  [KafkaAsyncContextHeaderNames.REPLY_TOPIC]?: string | string[];
  [KafkaAsyncContextHeaderNames.REPLY_PARTITION]?: string;
}

export const kafkaHeadersFactory = Factory.define<
  IKafkaBaseHeaders,
  IKafkaAsyncContext & { useZipkin?: boolean; asArray?: boolean }
>(({ params, transientParams }) => {
  const tgt: IHeaders = {};

  if ('replyTopic' in transientParams) {
    tgt[KafkaAsyncContextHeaderNames.REPLY_TOPIC] = transientParams.replyTopic ?? faker.string.alpha(10);
  }

  if ('replyPartition' in transientParams) {
    tgt[KafkaAsyncContextHeaderNames.REPLY_PARTITION] = transientParams.replyPartition
      ? transientParams.replyPartition.toString()
      : faker.number.int(10).toString();
  }

  if (transientParams?.asArray) {
    for (const key of Object.keys(tgt)) {
      if (typeof tgt[key] === 'string') {
        tgt[key] = tgt[key].split('-');
      }
    }
  }

  return {
    ...httpHeadersFactory.build(params, {
      transient: transientParams,
    }),
    ...tgt,
  };
});
