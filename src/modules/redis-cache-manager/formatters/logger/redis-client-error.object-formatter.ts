import { ReconnectStrategyError, MultiErrorReply } from '@redis/client';
import { Injectable } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';

@Injectable()
export class RedisClientErrorFormatter extends BaseErrorObjectFormatter<ReconnectStrategyError | MultiErrorReply> {
  isInstanceOf(obj: unknown): obj is ReconnectStrategyError | MultiErrorReply {
    return obj instanceof ReconnectStrategyError || obj instanceof MultiErrorReply;
  }

  transform(from: ReconnectStrategyError | MultiErrorReply): IKeyValue<unknown> {
    if (from instanceof ReconnectStrategyError) {
      return {
        originalError: this.unknownFormatter.transform(from.originalError),
        socketError: this.unknownFormatter.transform(from.socketError),
      };
    }

    return {
      replies: from.replies.map((error) => this.unknownFormatter.transform(error)),
      errorIndexes: from.errorIndexes,
    };
  }
}
