import { Injectable } from '@nestjs/common';
import { circularReplacerBuilder } from 'src/modules/common';
import { ILogRecordEncodeFormatter, ILogRecord, LogLevel } from '../../types/elk-logger.types';
import { ConsoleColors } from '../../types/console.types';

@Injectable()
export class ShortFormatter implements ILogRecordEncodeFormatter {
  transform(from: ILogRecord): string {
    let payload = from.payload !== undefined ? JSON.stringify(from.payload, circularReplacerBuilder()) : '';

    if (payload[0] === '{') {
      payload = payload.slice(1, -1);
    }

    let traceId = from.traceId?.slice(0, 18) + '/';
    traceId += from.traceId === from.spanId ? '=' : from.spanId?.slice(0, 8);

    return [
      this.getColorLevel(from.level) + from.level[0] + ConsoleColors.RESET,
      this.getColorMessage(from.level) + from.message + ConsoleColors.RESET,
      from.module ? `[${from.module.slice(-20)}]` : undefined,
      traceId,
      payload,
    ].join(' ');
  }

  private getColorLevel(level: LogLevel): string {
    return (
      {
        [LogLevel.TRACE]: ConsoleColors.WHITE,
        [LogLevel.DEBUG]: ConsoleColors.GRAY,
        [LogLevel.WARN]: ConsoleColors.YELLOW,
        [LogLevel.ERROR]: ConsoleColors.RED,
        [LogLevel.FATAL]: ConsoleColors.MAGENTA,
        [LogLevel.INFO]: ConsoleColors.GREEN,
      }[level] ?? ConsoleColors.BLACK
    );
  }

  private getColorMessage(level: LogLevel): string {
    return (
      {
        [LogLevel.DEBUG]: ConsoleColors.GRAY,
        [LogLevel.WARN]: ConsoleColors.YELLOW,
        [LogLevel.ERROR]: ConsoleColors.RED,
        [LogLevel.FATAL]: ConsoleColors.RED,
        [LogLevel.INFO]: ConsoleColors.GREEN,
      }[level] ?? ''
    );
  }
}
