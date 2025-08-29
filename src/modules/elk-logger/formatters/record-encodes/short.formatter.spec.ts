import { merge } from 'ts-deepmerge';
import { IKeyValue, LoggerMarkers } from 'src/modules/common';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { ConsoleColors } from '../../types/console.types';
import { ShortFormatter } from './short.formatter';
import { LogLevel } from '../../types/elk-logger.types';

describe(ShortFormatter.name, () => {
  let formatter: ShortFormatter;

  beforeAll(async () => {
    formatter = new ShortFormatter();
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
        `${levCol}${logRecord.level[0]}${ConsoleColors.RESET}` +
          ` ${mesCol}${logRecord.message}${ConsoleColors.RESET}` +
          ` [${logRecord.module.slice(-20)}]` +
          ` ${logRecord.traceId.slice(0, 18)}/${logRecord.spanId.slice(0, 8)}` +
          ` "details":["start process"],"error":{}`,
      );
    });
  });

  it('transform: array', async () => {
    const logRecord = logRecordFactory.build({
      markers: [LoggerMarkers.REQUEST],
      payload: ['rest'] as undefined as IKeyValue,
    });

    const copyLogRecord = merge({}, logRecord);
    const encodeLogRecord = formatter.transform(logRecord);

    expect(logRecord).toEqual(copyLogRecord);
    expect(encodeLogRecord).toEqual(
      `${ConsoleColors.GREEN}${logRecord.level[0]}${ConsoleColors.RESET}` +
        ` ${ConsoleColors.GREEN}${logRecord.message}${ConsoleColors.RESET}` +
        ` [${logRecord.module.slice(-20)}]` +
        ` ${logRecord.traceId.slice(0, 18)}/${logRecord.spanId.slice(0, 8)}` +
        ` ["rest"]`,
    );
  });

  it('transform: with out payload', async () => {
    const logRecord = logRecordFactory.build({
      markers: [LoggerMarkers.REQUEST],
      payload: undefined,
    });

    const copyLogRecord = merge({}, logRecord);
    const encodeLogRecord = formatter.transform(logRecord);

    expect(logRecord).toEqual(copyLogRecord);
    expect(encodeLogRecord).toEqual(
      `${ConsoleColors.GREEN}${logRecord.level[0]}${ConsoleColors.RESET}` +
        ` ${ConsoleColors.GREEN}${logRecord.message}${ConsoleColors.RESET}` +
        ` [${logRecord.module.slice(-20)}]` +
        ` ${logRecord.traceId.slice(0, 18)}/${logRecord.spanId.slice(0, 8)} `,
    );
  });

  it('transform: with TraceSpan', async () => {
    const logRecord = logRecordFactory.build({
      markers: [LoggerMarkers.REQUEST],
    });

    logRecord.traceId = undefined;
    logRecord.spanId = undefined;
    logRecord.module = undefined;

    const copyLogRecord = merge({}, logRecord);
    const encodeLogRecord = formatter.transform(logRecord);

    expect(logRecord).toEqual(copyLogRecord);
    expect(encodeLogRecord).toEqual(
      `${ConsoleColors.GREEN}${logRecord.level[0]}${ConsoleColors.RESET}` +
        ` ${ConsoleColors.GREEN}${logRecord.message}${ConsoleColors.RESET}` +
        `  undefined/= `,
    );
  });
});
