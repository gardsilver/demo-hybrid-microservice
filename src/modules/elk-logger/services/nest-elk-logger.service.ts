/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, LogLevel as NestLogLevel } from '@nestjs/common';
import { LogLevel, INestElkLoggerService, ILogFields } from '../types/elk-logger.types';
import { FormattersFactory } from '../formatters/formatters.factory';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import { BaseElkLoggerService } from './base.elk-logger.service';
import { ElkLoggerConfig } from './elk-logger.config';

const nestElkLogLevelAdapter = (level: NestLogLevel) => {
  return (
    {
      verbose: LogLevel.DEBUG,
      debug: LogLevel.DEBUG,
      log: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      fatal: LogLevel.FATAL,
    }[level] ?? LogLevel.DEBUG
  );
};

@Injectable()
export class NestElkLoggerService extends BaseElkLoggerService implements INestElkLoggerService {
  constructor(
    elkLoggerConfig: ElkLoggerConfig,
    recordEncodeFormatterFactory: RecordEncodeFormattersFactory,
    formatterFactory: FormattersFactory,
  ) {
    super(elkLoggerConfig, recordEncodeFormatterFactory, formatterFactory);
  }

  setLogLevels(levels: NestLogLevel[]) {
    this.elkLoggerConfig.setLogLevels(levels.map((level) => nestElkLogLevelAdapter(level)));
  }

  log(message: any, ...optionalParams: any[]) {
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);

    this._log(nestElkLogLevelAdapter('log'), messages, context);
  }

  error(message: any, ...optionalParams: any[]) {
    const { messages, context, stack } = this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);

    this._log(nestElkLogLevelAdapter('error'), messages, context, stack);
  }

  warn(message: any, ...optionalParams: any[]) {
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);

    this._log(nestElkLogLevelAdapter('warn'), messages, context);
  }

  debug(message: any, ...optionalParams: any[]) {
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);

    this._log(nestElkLogLevelAdapter('debug'), messages, context);
  }

  verbose(message: any, ...optionalParams: any[]) {
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);

    this._log(nestElkLogLevelAdapter('verbose'), messages, context);
  }

  fatal(message: any, ...optionalParams: any[]) {
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);

    this._log(nestElkLogLevelAdapter('fatal'), messages, context);
  }

  private getContextAndMessagesToPrint(args: unknown[]): {
    messages: unknown[];
    context?: string;
  } {
    if (args?.length <= 1) {
      return { messages: args };
    }

    const lastElement = args[args.length - 1];

    if (typeof lastElement !== 'string' || lastElement === undefined) {
      return { messages: args };
    }

    return {
      context: lastElement,
      messages: args.slice(0, args.length - 1),
    };
  }

  private getContextAndStackAndMessagesToPrint(args: unknown[]): {
    messages: unknown[];
    context?: string;
    stack?: string;
  } {
    if (args.length === 2) {
      return this.isStackFormat(args[1])
        ? {
            messages: [args[0]],
            stack: args[1] as string,
          }
        : {
            messages: [args[0]],
            context: args[1] as string,
          };
    }

    const { messages, context } = this.getContextAndMessagesToPrint(args);

    if (messages?.length <= 1) {
      return { messages, context };
    }

    const lastElement = messages[messages.length - 1];

    if (typeof lastElement !== 'string' || lastElement === undefined) {
      return { messages, context };
    }

    return {
      stack: lastElement,
      messages: messages.slice(0, messages.length - 1),
      context,
    };
  }

  private isStackFormat(stack: unknown): boolean {
    if (typeof stack === 'string' && stack !== undefined) {
      return /^(.)+\n\s+at .+:\d+:\d+/.test(stack);
    }

    return false;
  }

  private _log(level: LogLevel, messages: unknown[], context?: string, errorStack?: string): void {
    if (!this.isLogLevelEnabled(level)) {
      return;
    }

    messages.forEach((message) => {
      const logFields = this.logFieldsComposition(level, message, { context, errorStack });

      this.print(logFields);
    });
  }

  private logFieldsComposition(
    level: LogLevel,
    message: unknown,
    options: {
      context: string;
      errorStack?: string;
    },
  ): ILogFields {
    const logFields: ILogFields = {
      level,
      module: options.context,
      message: undefined,
      businessData: undefined,
      payload: {},
      traceId: undefined,
      spanId: undefined,
      parentSpanId: undefined,
      initialSpanId: undefined,
      timestamp: this.formatTimestamp(),
    };

    if (typeof message === 'function') {
      const messageAsStr = Function.prototype.toString.call(message);
      const isClass = messageAsStr.startsWith('class ');
      if (isClass) {
        logFields.message = message.name;
      } else {
        logFields.message = message();
      }
    } else if (typeof message === 'string') {
      logFields.message = message;
    } else if (message instanceof Error) {
      if (logFields.message === undefined) {
        logFields.message = message.message;
      }
      logFields.payload['error'] = message;
    } else if (typeof message === 'object') {
      if (this.elkLoggerConfig.isIgnoreObject(message)) {
        logFields.payload['message'] = message;
      } else {
        const errors = [];
        for (const [k, v] of Object.entries(message)) {
          if (typeof v === 'string' && logFields.message === undefined) {
            logFields.message = v;
            continue;
          }

          if (v instanceof Error) {
            if (logFields.message === undefined) {
              logFields.message = v.message;
            }
            errors.push(v);
            continue;
          }

          logFields.payload[k] = v;
        }

        if (errors.length) {
          logFields.payload['errors'] = errors;
        }
      }
    } else {
      logFields.message = message.toString();
    }

    if (options.errorStack) {
      logFields.payload['errorStack'] = options.errorStack
        ?.split('\n')
        ?.map((line) => line?.trim())
        ?.filter((line) => line || line !== '');
    }

    if (logFields.module === undefined) {
      logFields.module = NestElkLoggerService.name;
    }

    if (logFields.message === undefined) {
      logFields.message = 'Message as object';
    }

    return logFields;
  }
}
