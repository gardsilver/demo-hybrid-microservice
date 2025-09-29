import { IHeaders } from 'src/modules/common';
import { HttHeadersHelper } from 'src/modules/http/http-common';
import { KafkaAsyncContextHeaderNames } from '../types/constants';
import { IKafkaAsyncContext } from '../types/kafka.async-context.type';

export class KafkaHeadersHelper extends HttHeadersHelper {
  public static nameAsHeaderName(name: string, useZipkin?: boolean): string {
    return (
      {
        replyTopic: KafkaAsyncContextHeaderNames.REPLY_TOPIC,
        replyPartition: KafkaAsyncContextHeaderNames.REPLY_PARTITION,
      }[name] ?? HttHeadersHelper.nameAsHeaderName(name, useZipkin)
    );
  }

  public static toAsyncContext<Ctx extends IKafkaAsyncContext>(headers: IHeaders): Ctx {
    const replyPartitionRaw = KafkaHeadersHelper.searchValue(headers, KafkaAsyncContextHeaderNames.REPLY_PARTITION);

    return {
      ...HttHeadersHelper.toAsyncContext<Ctx>(headers),
      replyTopic: KafkaHeadersHelper.searchValue(headers, KafkaAsyncContextHeaderNames.REPLY_TOPIC),
      replyPartition: replyPartitionRaw ? Number(replyPartitionRaw) : undefined,
    };
  }
}
