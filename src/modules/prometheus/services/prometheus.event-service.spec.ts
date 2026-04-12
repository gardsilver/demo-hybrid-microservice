/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';
import { IGeneralAsyncContext } from 'src/modules/common';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { IPrometheusEventConfig, ITargetPrometheusOnMethod } from '../types/decorators.type';
import { ICounterService, IGaugeService, IHistogramService, ISummaryService } from '../types/types';
import { PrometheusEventArgs, PrometheusEventService } from './prometheus.event-service';
import { PrometheusManager } from './prometheus.manager';

describe(PrometheusEventService.name, () => {
  let spyCountInc;
  let spyGaugeInc;
  let spyGaugeDec;

  let spyHistogramObs;
  let spyHistogramStr;
  let spyHistogramEnd;

  let spySummaryObs;
  let spySummaryStr;
  let spySummaryEnd;

  let spyCustom;

  let counterService: ICounterService;
  let gaugeService: IGaugeService;
  let histogramService: IHistogramService;
  let summaryService: ISummaryService;
  let prometheusManager: PrometheusManager;

  let service: PrometheusEventService;

  let context: IGeneralAsyncContext;
  let ticketId: string;
  let eventArgs: PrometheusEventArgs;
  let eventConfig: IPrometheusEventConfig;

  beforeEach(async () => {
    spyCountInc = jest.fn();
    spyGaugeInc = jest.fn();
    spyGaugeDec = jest.fn();

    spyHistogramEnd = jest.fn();
    spyHistogramObs = jest.fn();
    spyHistogramStr = jest.fn().mockImplementation(() => spyHistogramEnd);

    spySummaryEnd = jest.fn();
    spySummaryObs = jest.fn();
    spySummaryStr = jest.fn().mockImplementation(() => spySummaryEnd);

    spyCustom = jest.fn().mockImplementation(() => ({}));

    counterService = {
      increment: spyCountInc,
    } as unknown as ICounterService;

    gaugeService = {
      increment: spyGaugeInc,
      decrement: spyGaugeDec,
    } as unknown as IGaugeService;

    histogramService = {
      observe: spyHistogramObs,
      startTimer: spyHistogramStr,
    } as unknown as IHistogramService;

    summaryService = {
      observe: spySummaryObs,
      startTimer: spySummaryStr,
    } as unknown as ISummaryService;

    prometheusManager = {
      counter: () => counterService,
      gauge: () => gaugeService,
      histogram: () => histogramService,
      summary: () => summaryService,
    } as unknown as PrometheusManager;

    service = new PrometheusEventService(prometheusManager);

    context = {
      ...TraceSpanBuilder.build(),
    };
    ticketId = faker.string.alpha(5);
    eventArgs = {
      error: new Error('Test error'),
      result: {
        status: 'ok',
      },
      duration: faker.number.int(6),
      labels: {
        status: faker.string.alpha(5),
      },
      methodsArgs: ['error'],
    };

    eventConfig = {
      counter: {
        increment: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
      },
      gauge: {
        increment: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        decrement: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
      },
      histogram: {
        observe: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        startTimer: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        end: {
          labels: {
            status: faker.string.alpha(5),
          },
        },
      },
      summary: {
        observe: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        startTimer: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        end: {
          labels: {
            status: faker.string.alpha(5),
          },
        },
      },
      custom: spyCustom,
    };

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(prometheusManager).toBeDefined();
    expect(service).toBeDefined();

    expect(PrometheusEventService['onMethods']).toBeDefined();
    expect(PrometheusEventService['subscription']).toBeDefined();
    expect(PrometheusEventService['onEndCallback']).toBeDefined();
    expect(PrometheusEventService['onEndCallback'].size).toBe(0);

    service.onApplicationShutdown();

    expect(PrometheusEventService['onMethods']).toBeUndefined();
    expect(PrometheusEventService['subscription']).toBeUndefined();
    expect(PrometheusEventService['onEndCallback']).toBeDefined();
    expect(PrometheusEventService['onEndCallback'].size).toBe(0);
  });

  it('skip', async () => {
    expect(PrometheusEventService['onMethods']).toBeDefined();
    expect(PrometheusEventService['subscription']).toBeDefined();

    const param: ITargetPrometheusOnMethod = {
      service: faker.string.alpha(5),
      method: faker.string.alpha(5),
      context,
      clear: false,
      prometheusEventConfig: false,
    };

    PrometheusEventService.emit(ticketId, eventArgs, param);

    param.prometheusEventConfig = {};
    PrometheusEventService.emit(ticketId, eventArgs, param);

    param.prometheusEventConfig = {
      counter: false,
      gauge: false,
      histogram: false,
      summary: false,
      custom: false,
    };
    PrometheusEventService.emit(ticketId, eventArgs, param);

    param.prometheusEventConfig = {
      counter: {
        increment: false,
      },
      gauge: {
        increment: false,
        decrement: false,
      },
      histogram: {
        observe: false,
        startTimer: false,
        end: false,
      },
      summary: {
        observe: false,
        startTimer: false,
        end: false,
      },
      custom: false,
    };
    PrometheusEventService.emit(ticketId, eventArgs, param);

    expect(spyCountInc).toHaveBeenCalledTimes(0);
    expect(spyGaugeInc).toHaveBeenCalledTimes(0);
    expect(spyGaugeDec).toHaveBeenCalledTimes(0);
    expect(spyHistogramObs).toHaveBeenCalledTimes(0);
    expect(spyHistogramStr).toHaveBeenCalledTimes(0);
    expect(spyHistogramEnd).toHaveBeenCalledTimes(0);
    expect(spySummaryObs).toHaveBeenCalledTimes(0);
    expect(spySummaryStr).toHaveBeenCalledTimes(0);
    expect(spySummaryEnd).toHaveBeenCalledTimes(0);
    expect(spyCustom).toHaveBeenCalledTimes(0);
  });

  it('apply', async () => {
    expect(PrometheusEventService['onMethods']).toBeDefined();
    expect(PrometheusEventService['subscription']).toBeDefined();
    expect(PrometheusEventService['onEndCallback'].size).toBe(0);

    const param: ITargetPrometheusOnMethod = {
      service: faker.string.alpha(5),
      method: faker.string.alpha(5),
      context,
      clear: false,
      prometheusEventConfig: { ...eventConfig },
    };

    jest.clearAllMocks();
    PrometheusEventService.emit(ticketId, eventArgs, param);

    expect(PrometheusEventService['onEndCallback'].size).toBe(1);

    expect(spyCountInc).toHaveBeenCalledTimes(1);
    expect(spyCountInc).toHaveBeenCalledWith(
      (eventConfig.counter as any).increment.metricConfig,
      (eventConfig.counter as any).increment.params,
    );

    expect(spyGaugeInc).toHaveBeenCalledTimes(1);
    expect(spyGaugeInc).toHaveBeenCalledWith(
      (eventConfig.gauge as any).increment.metricConfig,
      (eventConfig.gauge as any).increment.params,
    );

    expect(spyGaugeDec).toHaveBeenCalledTimes(1);
    expect(spyGaugeDec).toHaveBeenCalledWith(
      (eventConfig.gauge as any).decrement.metricConfig,
      (eventConfig.gauge as any).decrement.params,
    );

    expect(spyHistogramObs).toHaveBeenCalledTimes(1);
    expect(spyHistogramObs).toHaveBeenCalledWith(
      (eventConfig.histogram as any).observe.metricConfig,
      (eventConfig.histogram as any).observe.params,
    );

    expect(spyHistogramStr).toHaveBeenCalledTimes(1);
    expect(spyHistogramStr).toHaveBeenCalledWith(
      (eventConfig.histogram as any).startTimer.metricConfig,
      (eventConfig.histogram as any).startTimer.params,
    );

    expect(spyHistogramEnd).toHaveBeenCalledTimes(1);
    expect(spyHistogramEnd).toHaveBeenCalledWith((eventConfig.histogram as any).end.labels);

    expect(spySummaryObs).toHaveBeenCalledTimes(1);
    expect(spySummaryObs).toHaveBeenCalledWith(
      (eventConfig.summary as any).observe.metricConfig,
      (eventConfig.summary as any).observe.params,
    );

    expect(spySummaryStr).toHaveBeenCalledTimes(1);
    expect(spySummaryStr).toHaveBeenCalledWith(
      (eventConfig.summary as any).startTimer.metricConfig,
      (eventConfig.summary as any).startTimer.params,
    );

    expect(spySummaryEnd).toHaveBeenCalledTimes(1);
    expect(spySummaryEnd).toHaveBeenCalledWith((eventConfig.summary as any).end.labels);

    expect(spyCustom).toHaveBeenCalledTimes(1);

    expect({
      ...spyCustom.mock.calls[0][0],
      prometheusManager: spyCustom.mock.calls[0][0].prometheusManager ? true : false,
    }).toEqual({
      ...eventArgs,
      prometheusManager: true,
    });

    param.clear = true;
    param.prometheusEventConfig = false;

    jest.clearAllMocks();
    PrometheusEventService.emit(ticketId, eventArgs, param);

    expect(PrometheusEventService['onEndCallback'].size).toBe(0);

    expect(spyCountInc).toHaveBeenCalledTimes(0);
    expect(spyGaugeInc).toHaveBeenCalledTimes(0);
    expect(spyGaugeDec).toHaveBeenCalledTimes(0);
    expect(spyHistogramObs).toHaveBeenCalledTimes(0);
    expect(spyHistogramStr).toHaveBeenCalledTimes(0);
    expect(spyHistogramEnd).toHaveBeenCalledTimes(0);
    expect(spySummaryObs).toHaveBeenCalledTimes(0);
    expect(spySummaryStr).toHaveBeenCalledTimes(0);
    expect(spySummaryEnd).toHaveBeenCalledTimes(0);
    expect(spyCustom).toHaveBeenCalledTimes(0);

    param.clear = true;
    param.prometheusEventConfig = {
      histogram: eventConfig.histogram,
    };

    jest.clearAllMocks();
    PrometheusEventService.emit(ticketId, eventArgs, param);

    expect(PrometheusEventService['onEndCallback'].size).toBe(0);

    expect(spyHistogramObs).toHaveBeenCalledTimes(1);
    expect(spyHistogramStr).toHaveBeenCalledTimes(1);
    expect(spyHistogramEnd).toHaveBeenCalledTimes(1);
  });

  describe('crash', () => {
    it('handleCounter', async () => {
      expect(() =>
        service['handleCounter']({
          increment: true,
        }),
      ).toThrow('Invalid configuration Prometheus Handle Counter Increment!!!');
    });

    it('handleGauge', async () => {
      expect(() =>
        service['handleGauge']({
          increment: true,
        }),
      ).toThrow('Invalid configuration Prometheus Handle Gauge Increment!!!');

      expect(() =>
        service['handleGauge']({
          decrement: true,
        }),
      ).toThrow('Invalid configuration Prometheus Handle Gauge Decrement!!!');
    });

    it('handleHistogram', async () => {
      expect(() =>
        service['handleHistogram'](
          {
            startTimer: true,
          },
          { ticketId, eventArgs },
        ),
      ).toThrow('Invalid configuration Prometheus Handle Histogram StartTimer!!!');

      expect(() =>
        service['handleHistogram'](
          {
            observe: true,
          },
          { ticketId, eventArgs },
        ),
      ).toThrow('Invalid configuration Prometheus Handle Histogram Observe!!!');
    });

    it('handleSummary', async () => {
      expect(() =>
        service['handleSummary'](
          {
            startTimer: true,
          },
          { ticketId, eventArgs },
        ),
      ).toThrow('Invalid configuration Prometheus Handle Summary StartTimer!!!');

      expect(() =>
        service['handleSummary'](
          {
            observe: true,
          },
          { ticketId, eventArgs },
        ),
      ).toThrow('Invalid configuration Prometheus Handle Summary Observe!!!');
    });
  });
});
