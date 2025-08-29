import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService } from 'src/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';
import { PrometheusConfig } from './prometheus.config';
import { PrometheusCounterService } from './prometheus-counter.service';
import { PrometheusGaugeService } from './prometheus-gauge.service';
import { PrometheusHistogramService } from './prometheus-histogram.service';
import { PrometheusSummaryService } from './prometheus-summary.service';
import { PrometheusManager } from './prometheus.manager';
import {
  PROMETHEUS_COUNTER_SERVICE_DI,
  PROMETHEUS_GAUGE_SERVICE_DI,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
  PROMETHEUS_SUMMARY_SERVICE_DI,
} from '../types/tokens';

jest.mock('./prometheus-counter.service');
jest.mock('./prometheus-gauge.service');
jest.mock('./prometheus-histogram.service');
jest.mock('./prometheus-summary.service');
jest.mock('../builders/prometheus-metric.builder');

describe(PrometheusManager.name, () => {
  let logger: IElkLoggerService;
  let metricBuilder: PrometheusMetricBuilder;
  let counterService: PrometheusCounterService;
  let gaugeService: PrometheusGaugeService;
  let histogramService: PrometheusHistogramService;
  let summaryService: PrometheusSummaryService;
  let manager: PrometheusManager;

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
        {
          provide: PROMETHEUS_COUNTER_SERVICE_DI,
          useClass: PrometheusCounterService,
        },
        {
          provide: PROMETHEUS_GAUGE_SERVICE_DI,
          useClass: PrometheusGaugeService,
        },
        {
          provide: PROMETHEUS_HISTOGRAM_SERVICE_DI,
          useClass: PrometheusHistogramService,
        },
        {
          provide: PROMETHEUS_SUMMARY_SERVICE_DI,
          useClass: PrometheusSummaryService,
        },

        PrometheusManager,
      ],
    }).compile();

    metricBuilder = module.get(PrometheusMetricBuilder);
    counterService = module.get(PROMETHEUS_COUNTER_SERVICE_DI);
    gaugeService = module.get(PROMETHEUS_GAUGE_SERVICE_DI);
    histogramService = module.get(PROMETHEUS_HISTOGRAM_SERVICE_DI);
    summaryService = module.get(PROMETHEUS_SUMMARY_SERVICE_DI);
    manager = module.get(PrometheusManager);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(counterService).toBeDefined();
    expect(gaugeService).toBeDefined();
    expect(histogramService).toBeDefined();
    expect(summaryService).toBeDefined();
    expect(manager).toBeDefined();
  });

  it('metrics services', async () => {
    expect(manager.counter()).toBe(counterService);
    expect(manager.gauge()).toBe(gaugeService);
    expect(manager.histogram()).toBe(histogramService);
    expect(manager.summary()).toBe(summaryService);
  });

  it('getMetrics', async () => {
    const spy = jest.spyOn(metricBuilder, 'getMetrics');

    manager.getMetrics();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('getRegistry', async () => {
    const spy = jest.spyOn(metricBuilder, 'getRegistry');

    manager.getRegistry();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('getRegistryMetricNames', async () => {
    const spy = jest.spyOn(metricBuilder, 'getRegistryMetricNames');

    manager.getRegistryMetricNames();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
