import { Summary } from 'prom-client';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { METRIC_SUMMARY } from 'tests/modules/prometheus';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';
import { PrometheusConfig } from './prometheus.config';
import { MetricType } from '../types/types';
import { PrometheusSummaryService } from './prometheus-summary.service';

jest.mock('../builders/prometheus-metric.builder');

describe(PrometheusSummaryService.name, () => {
  let loggerBuilder: IElkLoggerServiceBuilder;
  let logger: IElkLoggerService;
  let metricBuilder: PrometheusMetricBuilder;
  let summaryService: PrometheusSummaryService;

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
        PrometheusSummaryService,
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    metricBuilder = module.get(PrometheusMetricBuilder);
    summaryService = module.get(PrometheusSummaryService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(summaryService).toBeDefined();
  });

  it('observe', async () => {
    const spy = jest.fn();
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerError = jest.spyOn(logger, 'error');

    const spyBuild = jest.spyOn(metricBuilder, 'build').mockImplementation(() => {
      return {
        observe: spy,
      } as undefined as Summary;
    });

    summaryService.observe(METRIC_SUMMARY, {
      value: 3,
    });

    summaryService.observe(METRIC_SUMMARY, {
      labels: { service: 'service', method: 'method' },
      value: 2,
    });

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusSummaryService.observe' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_SUMMARY, MetricType.SUMMARY);
    expect(spy).toHaveBeenCalledWith(3);
    expect(spy).toHaveBeenCalledWith({ service: 'service', method: 'method' }, 2);

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    summaryService.observe(METRIC_SUMMARY, { value: 3 });

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_SUMMARY,
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
      } as undefined as Summary;
    });

    summaryService.startTimer(METRIC_SUMMARY);

    summaryService.startTimer(METRIC_SUMMARY, {
      labels: { service: 'service', method: 'method' },
    });

    expect(spyLoggerBuilder).toHaveBeenCalledWith({ module: 'PrometheusSummaryService.startTimer' });
    expect(spyLoggerError).toHaveBeenCalledTimes(0);
    expect(spyBuild).toHaveBeenCalledWith(METRIC_SUMMARY, MetricType.SUMMARY);
    expect(spy).toHaveBeenCalledWith(undefined);
    expect(spy).toHaveBeenCalledWith({ service: 'service', method: 'method' });

    const error = new Error('Test');

    spy.mockImplementation(() => {
      throw error;
    });

    summaryService.startTimer(METRIC_SUMMARY);

    expect(spyLoggerError).toHaveBeenCalledWith('Prometheus fail', {
      payload: {
        metricConfig: METRIC_SUMMARY,
        error,
      },
      markers: ['prometheus', LoggerMarkers.ERROR],
    });
  });
});
