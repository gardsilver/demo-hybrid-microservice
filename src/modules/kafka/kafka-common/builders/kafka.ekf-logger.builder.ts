import { logCreator, LogEntry, logLevel } from 'kafkajs';
import { ILogFields, IElkLoggerServiceBuilder, IElkLoggerService, LogLevel } from 'src/modules/elk-logger';

const kafkaLogLevelParser = (
  levelKafka: logLevel,
): {
  level: LogLevel;
  message: string;
} => {
  const message =
    {
      [logLevel.NOTHING]: 'nothing',
      [logLevel.ERROR]: 'error',
      [logLevel.WARN]: 'warning',
      [logLevel.INFO]: 'info',
      [logLevel.DEBUG]: 'debug',
    }[levelKafka] ?? 'unknown';
  const level: LogLevel =
    {
      [logLevel.ERROR]: LogLevel.ERROR,
      [logLevel.WARN]: LogLevel.WARN,
      [logLevel.INFO]: LogLevel.INFO,
      [logLevel.DEBUG]: LogLevel.DEBUG,
    }[levelKafka] ?? undefined;

  return {
    level,
    message,
  };
};

export class KafkaElkLoggerBuilder {
  public static build(params?: { loggerBuilder: IElkLoggerServiceBuilder; logFields?: ILogFields }): logCreator {
    if (!params?.loggerBuilder) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (_level: logLevel) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return (_entry: LogEntry) => {
          /** Nothing */
        };
      };
    }

    const logger = params.loggerBuilder.build({
      module: 'KafkaService',
      ...params?.logFields,
    });

    return (levelCreate: logLevel) => {
      return (entry: LogEntry) => KafkaElkLoggerBuilder.writeLog(levelCreate, entry, logger);
    };
  }

  private static writeLog(
    levelCreate: logLevel,
    { namespace, level, label, log }: LogEntry,
    logger: IElkLoggerService,
  ): void {
    const parse = kafkaLogLevelParser(level ?? levelCreate);

    if (parse.level !== undefined) {
      logger.log(parse.level, log.message || `Undefined kafka ${parse.message}`, {
        payload: {
          namespace,
          level,
          label,
          log,
        },
      });
    }
  }
}
