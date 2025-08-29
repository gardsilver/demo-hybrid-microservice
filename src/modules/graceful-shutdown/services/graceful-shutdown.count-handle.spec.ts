import { tap } from 'rxjs';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
} from 'src/modules/elk-logger';
import {
  ICounterService,
  IGaugeService,
  IHistogramService,
  PROMETHEUS_COUNTER_SERVICE_DI,
  PROMETHEUS_GAUGE_SERVICE_DI,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
  PrometheusModule,
} from 'src/modules/prometheus';
import { MetadataExplorer } from 'src/modules/common';
import { DateTimestamp, TimeoutError } from 'src/modules/date-timestamp';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { TestShutdownService } from 'tests/modules/graceful-shutdown';
import { GracefulShutdownCountHandler } from './graceful-shutdown.count-handle';
import { ACTIVE_METHODS_DURATIONS, ACTIVE_METHODS_FAILED, ACTIVE_METHODS_GAUGE } from '../types/metrics';

describe(GracefulShutdownCountHandler.name, () => {
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let service: TestShutdownService;
  let gaugeService: IGaugeService;
  let histogramService: IHistogramService;
  let counterService: ICounterService;
  let handler: GracefulShutdownCountHandler;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [DiscoveryModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService(),
        },
        MetadataExplorer,
        TestShutdownService,
        GracefulShutdownCountHandler,
      ],
    })
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    await module.init();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    service = module.get(TestShutdownService);
    gaugeService = module.get(PROMETHEUS_GAUGE_SERVICE_DI);
    histogramService = module.get(PROMETHEUS_HISTOGRAM_SERVICE_DI);
    counterService = module.get(PROMETHEUS_COUNTER_SERVICE_DI);
    handler = module.get(GracefulShutdownCountHandler);

    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(handler).toBeDefined();
    expect(loggerBuilder.build()).toBe(logger);
  });

  describe('non async methods', () => {
    it('success - Должен увеличить счетчик и уменьшить по завершению.', async () => {
      const spyObserve = jest.spyOn(histogramService, 'observe');
      const spyIncrement = jest.spyOn(counterService, 'increment');
      const spyGaugeIncrement = jest.spyOn(gaugeService, 'increment');
      const spyGaugeDecrement = jest.spyOn(gaugeService, 'decrement');

      jest.spyOn(DateTimestamp.prototype, 'diff').mockImplementation(() => 200);

      const spy = jest.fn();
      const subscription = handler.getTotalCountActiveMethods().pipe(tap(spy)).subscribe();

      const result = service.onRun(200);

      expect(result).toBe(200);

      expect(spy).toHaveReturnedTimes(3);
      expect(spy).toHaveBeenCalledWith(0);
      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledWith(0);

      expect(spyGaugeIncrement).toHaveReturnedTimes(1);
      expect(spyGaugeIncrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
        labels: {
          service: 'TestShutdownService',
          method: 'onRun',
        },
        value: 1,
      });

      expect(spyGaugeDecrement).toHaveReturnedTimes(1);
      expect(spyGaugeDecrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
        labels: {
          service: 'TestShutdownService',
          method: 'onRun',
        },
        value: 1,
      });

      expect(spyObserve).toHaveBeenCalledTimes(1);
      expect(spyObserve).toHaveBeenCalledWith(ACTIVE_METHODS_DURATIONS, {
        labels: {
          service: 'TestShutdownService',
          method: 'onRun',
        },
        value: 0.2,
      });
      expect(spyIncrement).toHaveBeenCalledTimes(0);

      subscription.unsubscribe();
    });

    it('failed - Должен увеличить счетчик и уменьшить по завершению.', async () => {
      const spyObserve = jest.spyOn(histogramService, 'observe');
      const spyIncrement = jest.spyOn(counterService, 'increment');
      const spyGaugeIncrement = jest.spyOn(gaugeService, 'increment');
      const spyGaugeDecrement = jest.spyOn(gaugeService, 'decrement');

      jest.spyOn(DateTimestamp.prototype, 'diff').mockImplementation(() => 200);

      const spy = jest.fn();
      const subscription = handler.getTotalCountActiveMethods().pipe(tap(spy)).subscribe();

      expect(() => service.onError()).toThrow(new Error());

      expect(spy).toHaveReturnedTimes(3);
      expect(spy).toHaveBeenCalledWith(0);
      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledWith(0);

      expect(spyGaugeIncrement).toHaveReturnedTimes(1);
      expect(spyGaugeIncrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
        labels: {
          service: 'TestShutdownService',
          method: 'onError',
        },
        value: 1,
      });

      expect(spyGaugeDecrement).toHaveReturnedTimes(1);
      expect(spyGaugeDecrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
        labels: {
          service: 'TestShutdownService',
          method: 'onError',
        },
        value: 1,
      });

      expect(spyObserve).toHaveBeenCalledTimes(1);
      expect(spyObserve).toHaveBeenCalledWith(ACTIVE_METHODS_DURATIONS, {
        labels: {
          service: 'TestShutdownService',
          method: 'onError',
        },
        value: 0.2,
      });
      expect(spyIncrement).toHaveBeenCalledTimes(1);
      expect(spyIncrement).toHaveBeenCalledWith(ACTIVE_METHODS_FAILED, {
        labels: {
          service: 'TestShutdownService',
          method: 'onError',
        },
      });

      subscription.unsubscribe();
    });
  });

  describe('async methods', () => {
    it('success - Должен увеличить счетчик и уменьшить по завершению.', async () => {
      const spyObserve = jest.spyOn(histogramService, 'observe');
      const spyIncrement = jest.spyOn(counterService, 'increment');
      const spyGaugeIncrement = jest.spyOn(gaugeService, 'increment');
      const spyGaugeDecrement = jest.spyOn(gaugeService, 'decrement');

      jest.spyOn(DateTimestamp.prototype, 'diff').mockImplementation(() => 200);

      const spy = jest.fn();
      const subscription = handler.getTotalCountActiveMethods().pipe(tap(spy)).subscribe();

      jest.advanceTimersByTimeAsync(200);

      const result = await service.onAsyncRun(200);

      expect(result).toBe(200);

      expect(spy).toHaveReturnedTimes(3);
      expect(spy).toHaveBeenCalledWith(0);
      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledWith(0);

      expect(spyGaugeIncrement).toHaveReturnedTimes(1);
      expect(spyGaugeIncrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
        labels: {
          service: 'TestShutdownService',
          method: 'onAsyncRun',
        },
        value: 1,
      });

      expect(spyGaugeDecrement).toHaveReturnedTimes(1);
      expect(spyGaugeDecrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
        labels: {
          service: 'TestShutdownService',
          method: 'onAsyncRun',
        },
        value: 1,
      });

      expect(spyObserve).toHaveBeenCalledTimes(1);
      expect(spyObserve).toHaveBeenCalledWith(ACTIVE_METHODS_DURATIONS, {
        labels: {
          service: 'TestShutdownService',
          method: 'onAsyncRun',
        },
        value: 0.2,
      });
      expect(spyIncrement).toHaveBeenCalledTimes(0);

      subscription.unsubscribe();
    });

    it('failed - Должен увеличить счетчик и уменьшить по завершению.', async () => {
      const spyObserve = jest.spyOn(histogramService, 'observe');
      const spyIncrement = jest.spyOn(counterService, 'increment');
      const spyGaugeIncrement = jest.spyOn(gaugeService, 'increment');
      const spyGaugeDecrement = jest.spyOn(gaugeService, 'decrement');

      jest.spyOn(DateTimestamp.prototype, 'diff').mockImplementation(() => 200);

      const spy = jest.fn();
      const subscription = handler.getTotalCountActiveMethods().pipe(tap(spy)).subscribe();

      jest.advanceTimersByTimeAsync(200);

      let results, exception;
      try {
        results = await service.onAsyncError(200);
      } catch (error) {
        exception = error;
      }

      expect(exception).toEqual(new TimeoutError(200));
      expect(results).toBeUndefined();

      expect(spy).toHaveReturnedTimes(3);
      expect(spy).toHaveBeenCalledWith(0);
      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledWith(0);

      expect(spyGaugeIncrement).toHaveReturnedTimes(1);
      expect(spyGaugeIncrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
        labels: {
          service: 'TestShutdownService',
          method: 'onAsyncError',
        },
        value: 1,
      });

      expect(spyGaugeDecrement).toHaveReturnedTimes(1);
      expect(spyGaugeDecrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
        labels: {
          service: 'TestShutdownService',
          method: 'onAsyncError',
        },
        value: 1,
      });

      expect(spyObserve).toHaveBeenCalledTimes(1);
      expect(spyObserve).toHaveBeenCalledWith(ACTIVE_METHODS_DURATIONS, {
        labels: {
          service: 'TestShutdownService',
          method: 'onAsyncError',
        },
        value: 0.2,
      });
      expect(spyIncrement).toHaveBeenCalledTimes(1);
      expect(spyIncrement).toHaveBeenCalledWith(ACTIVE_METHODS_FAILED, {
        labels: {
          service: 'TestShutdownService',
          method: 'onAsyncError',
        },
      });

      subscription.unsubscribe();
    });
  });

  it('Должен работать с несколькими процессами.', async () => {
    const spyGaugeIncrement = jest.spyOn(gaugeService, 'increment');
    const spyGaugeDecrement = jest.spyOn(gaugeService, 'decrement');
    const spy = jest.fn();
    const subscription = handler.getTotalCountActiveMethods().pipe(tap(spy)).subscribe();

    jest.advanceTimersByTimeAsync(200);

    const result1 = service.onAsyncRun(200);
    const result2 = service.onRun(200);

    expect(await result1).toBe(200);
    expect(result2).toBe(200);

    expect(spy).toHaveReturnedTimes(5);
    expect(spy).toHaveBeenCalledWith(0);
    expect(spy).toHaveBeenCalledWith(1);
    expect(spy).toHaveBeenCalledWith(2);
    expect(spy).toHaveBeenCalledWith(1);
    expect(spy).toHaveBeenCalledWith(0);

    expect(spyGaugeIncrement).toHaveReturnedTimes(2);
    expect(spyGaugeIncrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
      labels: {
        service: 'TestShutdownService',
        method: 'onRun',
      },
      value: 1,
    });
    expect(spyGaugeIncrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
      labels: {
        service: 'TestShutdownService',
        method: 'onAsyncRun',
      },
      value: 1,
    });

    expect(spyGaugeDecrement).toHaveReturnedTimes(2);
    expect(spyGaugeDecrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
      labels: {
        service: 'TestShutdownService',
        method: 'onRun',
      },
      value: 1,
    });
    expect(spyGaugeDecrement).toHaveBeenCalledWith(ACTIVE_METHODS_GAUGE, {
      labels: {
        service: 'TestShutdownService',
        method: 'onAsyncRun',
      },
      value: 1,
    });

    subscription.unsubscribe();
  });

  it('statusActiveProcess', async () => {
    jest.advanceTimersByTimeAsync(100);

    const result = service.onAsyncRun(200);

    let status = await handler.statusActiveProcess();

    expect(status).toEqual({
      total: 1,
      details: [
        {
          count: 1,
          service: 'TestShutdownService',
          method: 'onAsyncRun',
        },
      ],
    });

    jest.advanceTimersByTimeAsync(100);

    expect(await result).toEqual(200);

    jest.advanceTimersByTimeAsync(100);

    status = await handler.statusActiveProcess();

    expect(status).toEqual({
      total: 0,
      details: [],
    });
  });
});
