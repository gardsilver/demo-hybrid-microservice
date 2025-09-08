import { ReconnectStrategyError, MultiErrorReply } from '@redis/client';
import { ExceptionHelper, IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from 'src/modules/elk-logger';

export class RedisClientErrorFormatter implements IObjectFormatter<ReconnectStrategyError | MultiErrorReply> {
  canFormat(obj: unknown): obj is ReconnectStrategyError | MultiErrorReply {
    return obj instanceof ReconnectStrategyError || obj instanceof MultiErrorReply;
  }

  transform(from: ReconnectStrategyError | MultiErrorReply): IKeyValue<unknown> {
    if (from instanceof ReconnectStrategyError) {
      return {
        originalError: this.formatBase(from.originalError),
        socketError: this.formatBase(from.socketError),
      };
    }

    return {
      replies: from.replies.map((error) => this.formatBase(error)),
      errorIndexes: from.errorIndexes,
    };
  }

  private formatBase(from: unknown | Error): unknown | IKeyValue<unknown> {
    if (from && from instanceof Error) {
      const fields = this.canFormat(from) ? this.transform(from) : {};

      return {
        type: from.name ?? from.constructor.name,
        message: from.message,
        ...fields,
        stack: ExceptionHelper.stackFormat(from.stack),
        errors:
          'errors' in from
            ? Array.isArray(from['errors'])
              ? from['errors'].map((err) => this.formatBase(err))
              : this.formatBase(from['errors'])
            : undefined,
        cause: from.cause ? this.formatBase(from.cause) : undefined,
      };
    }

    return from;
  }
}
