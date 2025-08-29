import { Gauge } from 'prom-client';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { METRIC_GAUGE } from 'tests/modules/prometheus';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';
import { PrometheusConfig } from './prometheus.config';
import { MetricType } from '../types/types';
import { PrometheusGaugeService } from './prometheus-gauge.service';

jest.mock('../builders/prometheus-metric.builder');

describe(PrometheusGaugeService.name, () => {
  let loggerBuilder: IElkLoggerServiceBuilder;
  let logger: IElkLoggerService;
  let metricBuilder: PrometheusMetricBuilder;
  let gaugeService: PrometheusGaugeService;

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
        PrometheusGaugeService,
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    metricBuilder = module.get(PrometheusMetricBuilder);
    gaugeService = module.get(PrometheusGaugeService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(gaugeService).toBeDefined();
  });

  it('increment', async () => {
    const spy = jest.fn();
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerError = jest.spyOn(logger, 'error');

    const spyBuild = jest.spyOn(metricBuilder, 'build').mockImplementation(() => {
      return {
        inc: spy,
      } as undefined as Gauge;
    });

    gaugeService.increment(METRIC_GAUGE, {
      value: 3,
    });

    gaugeService.increment(METRIC_GAUGE, {
      labels: { service: 'service', method: 'method' },
      value: 2,
    });

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusGaugeService.increment' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_GAUGE, MetricType.GAUGE);
    expect(spy).toHaveBeenCalledWith(3);
    expect(spy).toHaveBeenCalledWith({ service: 'service', method: 'method' }, 2);

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    gaugeService.increment(METRIC_GAUGE, { value: 3 });

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_GAUGE,
        params: {
          value: 3,
        },
        error,
      },
      markers: ['prometheus', LoggerMarkers.ERROR],
    });
  });

  it('decrement', async () => {
    const spy = jest.fn();
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerError = jest.spyOn(logger, 'error');

    const spyBuild = jest.spyOn(metricBuilder, 'build').mockImplementation(() => {
      return {
        dec: spy,
      } as undefined as Gauge;
    });

    gaugeService.decrement(METRIC_GAUGE, {
      value: 3,
    });

    gaugeService.decrement(METRIC_GAUGE, {
      labels: { service: 'service', method: 'method' },
      value: 2,
    });

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusGaugeService.decrement' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_GAUGE, MetricType.GAUGE);
    expect(spy).toHaveBeenCalledWith(3);
    expect(spy).toHaveBeenCalledWith({ service: 'service', method: 'method' }, 2);

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    gaugeService.decrement(METRIC_GAUGE, { value: 3 });

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_GAUGE,
        params: {
          value: 3,
        },
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
      } as undefined as Gauge;
    });

    await gaugeService.get(METRIC_GAUGE);

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusGaugeService.get' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_GAUGE, MetricType.GAUGE);
    expect(spy).toHaveBeenCalledWith();

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    await gaugeService.get(METRIC_GAUGE);

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_GAUGE,
        error,
      },
      markers: ['prometheus', LoggerMarkers.ERROR],
    });
  });
});
