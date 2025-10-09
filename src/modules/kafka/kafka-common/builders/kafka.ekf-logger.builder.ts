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

export interface IKafkaLogFilterParams {
  namespace: string;
  message?: string;
}

export const KAFKA_DEFAULT_LOG_FILTER_PARAMS = [
  {
    namespace: 'Connection',
    message: 'Connection timeout',
  },
  {
    namespace: 'Connection',
    message: 'Connection error',
  },
  {
    namespace: 'Consumer',
    message: 'Restarting the consumer',
  },
  {
    namespace: 'BrokerPool',
    message: 'Failed to connect to seed broker',
  },
];

export const kafkaLogFilter = (logEntry: LogEntry, params: IKafkaLogFilterParams[]): boolean => {
  return params.reduce((isSkip, param) => {
    if (logEntry.namespace === param.namespace) {
      if (param.message === undefined) {
        return true;
      }
      if (logEntry.log?.message?.startsWith(param.message)) {
        return true;
      }
    }
    return isSkip;
  }, false);
};

export interface KafkaElkLoggerBuilderOptions {
  loggerBuilder: IElkLoggerServiceBuilder;
  logTitle?: string;
  logFields?: ILogFields;
  logFilterParams?: IKafkaLogFilterParams[];
}
export class KafkaElkLoggerBuilder {
  public static build(params?: KafkaElkLoggerBuilderOptions): logCreator {
    if (!params?.loggerBuilder) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (_level: logLevel) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return (_entry: LogEntry) => {
          /** Nothing */
        };
      };
    }
    const filterParams: IKafkaLogFilterParams[] = params?.logFilterParams ?? KAFKA_DEFAULT_LOG_FILTER_PARAMS;

    const logger = params.loggerBuilder.build({
      module: 'KafkaService',
      ...params?.logFields,
    });

    return (levelCreate: logLevel) => {
      return (entry: LogEntry) =>
        KafkaElkLoggerBuilder.writeLog(
          levelCreate,
          entry,
          logger,
          filterParams,
          params?.logTitle !== undefined ? `${params?.logTitle}` : '',
        );
    };
  }

  private static writeLog(
    levelCreate: logLevel,
    { namespace, level, label, log }: LogEntry,
    logger: IElkLoggerService,
    logFilterParams: IKafkaLogFilterParams[],
    logTitle: string,
  ): void {
    const parse = kafkaLogLevelParser(level ?? levelCreate);

    if (parse.level !== undefined && kafkaLogFilter({ namespace, level, label, log }, logFilterParams) === false) {
      logger.log(parse.level, logTitle + (log.message || `Undefined kafka ${parse.message}`), {
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
