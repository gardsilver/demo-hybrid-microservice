import { ReplaySubject, Subscription } from 'rxjs';
import { OnApplicationShutdown, Inject, Injectable } from '@nestjs/common';
import { GeneralAsyncContext } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI } from '../types/tokens';
import { IElkLoggerServiceBuilder, LogLevel } from '../types/elk-logger.types';
import { IElkLoggerEvent, IElkLoggerParams, ITargetLoggerOnMethod } from '../types/decorators.type';

const defaultLevel = {
  [IElkLoggerEvent.BEFORE_CALL]: LogLevel.INFO,
  [IElkLoggerEvent.AFTER_CALL]: LogLevel.INFO,
  [IElkLoggerEvent.THROW_CALL]: LogLevel.ERROR,
  [IElkLoggerEvent.FINALLY_CALL]: LogLevel.DEBUG,
};

const defaultMessage = {
  [IElkLoggerEvent.BEFORE_CALL]: '[[method]] called',
  [IElkLoggerEvent.AFTER_CALL]: '[[method]] success',
  [IElkLoggerEvent.THROW_CALL]: '[[method]] failed',
  [IElkLoggerEvent.FINALLY_CALL]: '[[method]] complete',
};

@Injectable()
export class ElkLoggerEventService implements OnApplicationShutdown {
  private static loggerOnMethods: ReplaySubject<ITargetLoggerOnMethod & { event: IElkLoggerEvent }> | undefined;
  private static subscription: Subscription | undefined;

  constructor(@Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder) {
    if (ElkLoggerEventService.loggerOnMethods === undefined) {
      ElkLoggerEventService.loggerOnMethods = new ReplaySubject<ITargetLoggerOnMethod & { event: IElkLoggerEvent }>(
        undefined,
      );

      ElkLoggerEventService.subscription = ElkLoggerEventService.loggerOnMethods.asObservable().subscribe({
        next: (value) => {
          if (value === undefined) {
            return;
          }

          this.handleOnMethod(value);
        },
      });
    }
  }

  public async onApplicationShutdown(): Promise<void> {
    ElkLoggerEventService.subscription?.unsubscribe();

    ElkLoggerEventService.subscription = undefined;
    ElkLoggerEventService.loggerOnMethods = undefined;
  }

  public static emit(event: IElkLoggerEvent, param: ITargetLoggerOnMethod): void {
    ElkLoggerEventService.loggerOnMethods?.next({ ...param, event });
  }

  private handleOnMethod(param: ITargetLoggerOnMethod & { event: IElkLoggerEvent }): void {
    if (param.loggerPrams === false) {
      return;
    }

    const loggerPrams: IElkLoggerParams = param.loggerPrams;
    const moduleName = `${param.service}.${param.method}`;

    const logger = this.loggerBuilder.build({
      module: moduleName,
      ...(loggerPrams.fields ?? {}),
    });

    GeneralAsyncContext.instance.runWithContext(() => {
      logger.log(
        loggerPrams.level ?? defaultLevel[param.event],
        loggerPrams.message ?? defaultMessage[param.event].replace('[[method]]', moduleName),
        loggerPrams.data,
      );
    }, param.context ?? {});
  }
}
