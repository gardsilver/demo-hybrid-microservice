import { Histogram } from 'prom-client';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { METRIC_HISTOGRAM } from 'tests/modules/prometheus';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';
import { PrometheusConfig } from './prometheus.config';
import { MetricType } from '../types/types';
import { PrometheusHistogramService } from './prometheus-histogram.service';

jest.mock('../builders/prometheus-metric.builder');

describe(PrometheusHistogramService.name, () => {
  let loggerBuilder: IElkLoggerServiceBuilder;
  let logger: IElkLoggerService;
  let metricBuilder: PrometheusMetricBuilder;
  let histogramService: PrometheusHistogramService;

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
        PrometheusHistogramService,
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    metricBuilder = module.get(PrometheusMetricBuilder);
    histogramService = module.get(PrometheusHistogramService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(histogramService).toBeDefined();
  });

  it('observe', async () => {
    const spy = jest.fn();
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerError = jest.spyOn(logger, 'error');

    const spyBuild = jest.spyOn(metricBuilder, 'build').mockImplementation(() => {
      return {
        observe: spy,
      } as undefined as Histogram;
    });

    histogramService.observe(METRIC_HISTOGRAM, {
      value: 3,
    });

    histogramService.observe(METRIC_HISTOGRAM, {
      labels: { service: 'service', method: 'method' },
      value: 2,
    });

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusHistogramService.observe' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_HISTOGRAM, MetricType.HISTOGRAM);
    expect(spy).toHaveBeenCalledWith(3);
    expect(spy).toHaveBeenCalledWith({ service: 'service', method: 'method' }, 2);

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    histogramService.observe(METRIC_HISTOGRAM, { value: 3 });

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_HISTOGRAM,
        params: {
          value: 3,
        },
        error,
      },
      markers: ['prometheus', LoggerMarkers.ERROR],
    });
  });

  it('startTimer', async () => {
    const spy = jest.fn();
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerError = jest.spyOn(logger, 'error');

    const spyBuild = jest.spyOn(metricBuilder, 'build').mockImplementation(() => {
      return {
        startTimer: spy,
      } as undefined as Histogram;
    });

    histogramService.startTimer(METRIC_HISTOGRAM);

    histogramService.startTimer(METRIC_HISTOGRAM, {
      labels: { service: 'service', method: 'method' },
    });

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusHistogramService.startTimer' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_HISTOGRAM, MetricType.HISTOGRAM);
    expect(spy).toHaveBeenCalledWith(undefined);
    expect(spy).toHaveBeenCalledWith({ service: 'service', method: 'method' });

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    histogramService.startTimer(METRIC_HISTOGRAM);

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_HISTOGRAM,
        error,
      },
      markers: ['prometheus', LoggerMarkers.ERROR],
    });
  });
});
