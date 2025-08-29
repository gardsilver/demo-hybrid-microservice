import { merge } from 'ts-deepmerge';
import { LoggerMarkers } from 'src/modules/common';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { SimpleFormatter } from './simple.formatter';
import { ConsoleColors } from '../../types/console.types';
import { LogLevel } from '../../types/elk-logger.types';

describe(SimpleFormatter.name, () => {
  let formatter: SimpleFormatter;

  beforeAll(async () => {
    formatter = new SimpleFormatter();
  });

  it('transform', async () => {
    const error = new Error('test');

    const logRecord = logRecordFactory.build({
      markers: [LoggerMarkers.REQUEST],
      payload: {
        details: ['start process'],
        error,
      },
    });

    [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL].forEach((level) => {
      logRecord.level = level;
      const mesCol =
        {
          [LogLevel.DEBUG]: ConsoleColors.GRAY,
          [LogLevel.WARN]: ConsoleColors.YELLOW,
          [LogLevel.ERROR]: ConsoleColors.RED,
          [LogLevel.FATAL]: ConsoleColors.RED,
          [LogLevel.INFO]: ConsoleColors.GREEN,
        }[level] ?? '';

      const levCol =
        {
          [LogLevel.TRACE]: ConsoleColors.WHITE,
          [LogLevel.DEBUG]: ConsoleColors.GRAY,
          [LogLevel.WARN]: ConsoleColors.YELLOW,
          [LogLevel.ERROR]: ConsoleColors.RED,
          [LogLevel.FATAL]: ConsoleColors.MAGENTA,
          [LogLevel.INFO]: ConsoleColors.GREEN,
        }[level] ?? ConsoleColors.BLACK;

      const copyLogRecord = merge({}, logRecord);
      const encodeLogRecord = formatter.transform(logRecord);

      expect(logRecord).toEqual(copyLogRecord);
      expect(encodeLogRecord).toEqual(
        `${logRecord.timestamp} ${levCol}${logRecord.level}${ConsoleColors.RESET}` +
          ` ${logRecord.module} ${mesCol}${logRecord.message}${ConsoleColors.RESET}` +
          ` ${logRecord.traceId} \n markers: [request]\n {\n  "details": [\n    "start process"\n  ],\n  "error": {}\n}`,
      );
    });
  });

  it('transform: not full data', async () => {
    const logRecord = logRecordFactory.build({
      payload: undefined,
    });

    logRecord.module = undefined;
    logRecord.message = undefined;
    logRecord.traceId = undefined;
    logRecord.spanId = undefined;

    const copyLogRecord = merge({}, logRecord);
    const encodeLogRecord = formatter.transform(logRecord);

    expect(logRecord).toEqual(copyLogRecord);
    expect(encodeLogRecord).toEqual(
      `${logRecord.timestamp} ${ConsoleColors.GREEN}${logRecord.level}${ConsoleColors.RESET}` +
        `  ${ConsoleColors.GREEN}undefined${ConsoleColors.RESET}` +
        `   `,
    );
  });
});
