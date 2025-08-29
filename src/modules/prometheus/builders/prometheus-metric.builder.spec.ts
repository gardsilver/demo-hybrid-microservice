import * as PromClient from 'prom-client';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { METRIC_COUNTER, METRIC_GAUGE, METRIC_HISTOGRAM, METRIC_SUMMARY } from 'tests/modules/prometheus';
import { PrometheusConfig } from '../services/prometheus.config';
import { MetricType } from '../types/types';
import { PrometheusMetricBuilder } from './prometheus-metric.builder';

describe(PrometheusMetricBuilder.name, () => {
  let spySetDefaultLabels;
  let spyCollectDefaultMetrics;
  let builder: PrometheusMetricBuilder;

  beforeAll(async () => {
    spyCollectDefaultMetrics = jest.spyOn(PromClient, 'collectDefaultMetrics');
    spySetDefaultLabels = jest.spyOn(PromClient.Registry.prototype, 'setDefaultLabels');

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService({
            APPLICATION_NAME: 'appName',
            MICROSERVICE_NAME: 'micName',
            MICROSERVICE_VERSION: 'micVer',
          }),
        },
        PrometheusConfig,
        PrometheusMetricBuilder,
      ],
    }).compile();

    builder = module.get(PrometheusMetricBuilder);
  });

  it('init', async () => {
    expect(builder).toBeDefined();
    expect(builder.getRegistry()).toBeDefined();
    expect(spyCollectDefaultMetrics).toHaveBeenCalledWith({
      register: PrometheusMetricBuilder['registry'],
    });
    expect(spySetDefaultLabels).toHaveBeenCalledWith({
      application: 'appName',
      microservice: 'micName',
      version: 'micVer',
    });
  });

  describe('build: success', () => {
    it('Должен упасть с ошибкой при попытке получить не известную метрику', async () => {
      expect(() => {
        return builder.build(METRIC_GAUGE, 'custom' as undefined as MetricType);
      }).toThrow(new Error('Не известный тип метрики (custom)'));
    });

    it('Counter', async () => {
      const spyRegisterMetric = jest.spyOn(PromClient.Registry.prototype, 'registerMetric');

      const metric = builder.build(METRIC_COUNTER, MetricType.COUNTER);

      expect(metric instanceof PromClient.Counter).toBeTruthy();
      expect(spyRegisterMetric).toHaveBeenCalledWith(metric);
    });

    it('Gauge', async () => {
      const spyRegisterMetric = jest.spyOn(PromClient.Registry.prototype, 'registerMetric');

      const metric = builder.build(METRIC_GAUGE, MetricType.GAUGE);

      expect(metric instanceof PromClient.Gauge).toBeTruthy();
      expect(spyRegisterMetric).toHaveBeenCalledWith(metric);
    });

    it('Histogram', async () => {
      const spyRegisterMetric = jest.spyOn(PromClient.Registry.prototype, 'registerMetric');

      const metric = builder.build(METRIC_HISTOGRAM, MetricType.HISTOGRAM);

      expect(metric instanceof PromClient.Histogram).toBeTruthy();
      expect(spyRegisterMetric).toHaveBeenCalledWith(metric);
    });

    it('Summary', async () => {
      const spyRegisterMetric = jest.spyOn(PromClient.Registry.prototype, 'registerMetric');

      const metric = builder.build(METRIC_SUMMARY, MetricType.SUMMARY);

      expect(metric instanceof PromClient.Summary).toBeTruthy();
      expect(spyRegisterMetric).toHaveBeenCalledWith(metric);
    });

    it('При попытке переназначить метрику должен падать с ошибкой', async () => {
      expect(() => {
        return builder.build(METRIC_GAUGE, MetricType.COUNTER);
      }).toThrow(
        new Error(
          `Нельзя использовать ${METRIC_GAUGE.name} для ${MetricType.COUNTER}. Зарегистрировано как ${MetricType.GAUGE}.`,
        ),
      );
    });
  });

  it('getMetrics', async () => {
    const spyGetMetrics = jest.spyOn(PromClient.Registry.prototype, 'metrics');

    await builder.getMetrics();

    expect(spyGetMetrics).toHaveBeenCalledTimes(1);
  });

  it('getRegistryMetricNames', async () => {
    expect(builder.getRegistryMetricNames()).toEqual([
      'metric_counter',
      'metric_gauge',
      'metric_histogram',
      'metric_summary',
    ]);
  });
});
