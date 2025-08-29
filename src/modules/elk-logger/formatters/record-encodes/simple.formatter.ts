import { Injectable } from '@nestjs/common';
import { circularReplacerBuilder } from 'src/modules/common';
import { ILogRecordEncodeFormatter, ILogRecord, LogLevel } from '../../types/elk-logger.types';
import { ConsoleColors } from '../../types/console.types';

@Injectable()
export class SimpleFormatter implements ILogRecordEncodeFormatter {
  transform(from: ILogRecord): string {
    return [
      from.timestamp,
      this.getColorsLevel(from.level) + from.level + ConsoleColors.RESET,
      from.module === undefined ? '' : from.module,
      this.getColorsMessage(from.level) + from.message + ConsoleColors.RESET,
      from.traceId,
      from.markers?.length ? '\n markers: [' + from.markers.join(', ') + ']\n' : '',
      from.payload !== undefined ? JSON.stringify(from.payload, circularReplacerBuilder(), 2) : '',
    ].join(' ');
  }

  private getColorsLevel(level: LogLevel): string {
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

  private getColorsMessage(level: LogLevel): string {
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
