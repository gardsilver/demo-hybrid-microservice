import { Injectable } from '@nestjs/common';
import { IEncodeFormatter, LogFormat } from '../../types/elk-logger.types';
import { PruneConfig } from '../prune.config';
import { PruneMessages } from '../../types/prune.types';

/**
 * Обрезает строку в соответствии с настройками.
 */
@Injectable()
export class PruneEncoder implements IEncodeFormatter {
  constructor(private readonly pruneConfig: PruneConfig) {}

  priority(): number {
    return Infinity;
  }

  transform(from: string): string {
    if (
      this.pruneConfig.getElkLoggerConfig().getFormatLogRecord() === LogFormat.SHORT &&
      from.length > this.pruneConfig.getMaxLengthPruneEncoder()
    ) {
      return from.slice(0, this.pruneConfig.getMaxLengthPruneEncoder()) + PruneMessages.LIMIT_LENGTH.toString();
    }

    return from;
  }
}
