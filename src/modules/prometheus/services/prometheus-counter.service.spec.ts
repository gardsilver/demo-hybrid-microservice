import { Counter } from 'prom-client';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { METRIC_COUNTER } from 'tests/modules/prometheus';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';
import { PrometheusCounterService } from './prometheus-counter.service';
import { PrometheusConfig } from './prometheus.config';
import { MetricType } from '../types/types';

jest.mock('../builders/prometheus-metric.builder');

describe(PrometheusCounterService.name, () => {
  let loggerBuilder: IElkLoggerServiceBuilder;
  let logger: IElkLoggerService;
  let metricBuilder: PrometheusMetricBuilder;
  let counterService: PrometheusCounterService;

  beforeAll(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService(),
        },
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: {
            build: () => logger,
          },
        },
        PrometheusConfig,
        PrometheusMetricBuilder,
        PrometheusCounterService,
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    metricBuilder = module.get(PrometheusMetricBuilder);
    counterService = module.get(PrometheusCounterService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(counterService).toBeDefined();
  });

  it('increment', async () => {
    const spy = jest.fn();
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerError = jest.spyOn(logger, 'error');

    const spyBuild = jest.spyOn(metricBuilder, 'build').mockImplementation(() => {
      return {
        inc: spy,
      } as undefined as Counter;
    });

    counterService.increment(METRIC_COUNTER);

    counterService.increment(METRIC_COUNTER, {
      labels: { service: 'service', method: 'method' },
    });

    counterService.increment(METRIC_COUNTER, {
      labels: { service: 'service', method: 'method' },
      value: 3,
    });

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusCounterService.increment' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_COUNTER, MetricType.COUNTER);
    expect(spy).toHaveBeenCalledWith(undefined);
    expect(spy).toHaveBeenCalledWith({ service: 'service', method: 'method' }, undefined);
    expect(spy).toHaveBeenCalledWith({ service: 'service', method: 'method' }, 3);

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    counterService.increment(METRIC_COUNTER);

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_COUNTER,
        error,
      },
      markers: ['prometheus', LoggerMarkers.ERROR],
    });
  });

  it('get', async () => {
    const spy = jest.fn();
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerError = jest.spyOn(logger, 'error');

    const spyBuild = jest.spyOn(metricBuilder, 'build').mockImplementation(() => {
      return {
        get: spy,
      } as undefined as Counter;
    });

    await counterService.get(METRIC_COUNTER);

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusCounterService.get' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_COUNTER, MetricType.COUNTER);
    expect(spy).toHaveBeenCalledWith();

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    await counterService.get(METRIC_COUNTER);

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_COUNTER,
        error,
      },
      markers: ['prometheus', LoggerMarkers.ERROR],
    });
  });
});
