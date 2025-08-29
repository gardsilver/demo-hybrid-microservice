import { collectDefaultMetrics, Counter, Gauge, Histogram, Summary, Registry } from 'prom-client';
import { Injectable } from '@nestjs/common';
import { PrometheusConfig } from '../services/prometheus.config';
import { MetricType, IMetricConfig } from '../types/types';

type PromMetricTypes = Counter | Gauge | Histogram | Summary;

@Injectable()
export class PrometheusMetricBuilder {
  private static historyTypes = new Map<string, MetricType>();
  private static historyMetrics = new Map<string, PromMetricTypes>();
  private static registry: Registry;

  constructor(prometheusConfig: PrometheusConfig) {
    if (PrometheusMetricBuilder.registry === undefined) {
      PrometheusMetricBuilder.registry = new Registry();
      collectDefaultMetrics({ register: PrometheusMetricBuilder.registry });

      PrometheusMetricBuilder.registry.setDefaultLabels({
        application: prometheusConfig.getApplicationName(),
        microservice: prometheusConfig.getMicroserviceName(),
        version: prometheusConfig.getMicroserviceVersion(),
      });
    }
  }

  public async getMetrics(): Promise<string> {
    return PrometheusMetricBuilder.registry.metrics();
  }

  public getRegistry(): Registry {
    return PrometheusMetricBuilder.registry;
  }

  public getRegistryMetricNames(): string[] {
    return Array.from(PrometheusMetricBuilder.historyMetrics.keys());
  }

  private checkMetric(metricConfig: IMetricConfig, registerType: MetricType, usedType: MetricType): void {
    if (registerType !== usedType) {
      throw Error(`Нельзя использовать ${metricConfig.name} для ${usedType}. Зарегистрировано как ${registerType}.`);
    }
  }

  public build(metricConfig: IMetricConfig, usedType: MetricType): PromMetricTypes {
    if (PrometheusMetricBuilder.historyTypes.has(metricConfig.name)) {
      const registerType: MetricType = PrometheusMetricBuilder.historyTypes.get(metricConfig.name);
      this.checkMetric(metricConfig, registerType, usedType);
    } else {
      PrometheusMetricBuilder.historyTypes.set(metricConfig.name, usedType);
    }

    if (PrometheusMetricBuilder.historyMetrics.has(metricConfig.name)) {
      return PrometheusMetricBuilder.historyMetrics.get(metricConfig.name);
    }

    let metric: PromMetricTypes;

    switch (usedType) {
      case MetricType.COUNTER:
        metric = new Counter(metricConfig);
        break;
      case MetricType.GAUGE:
        metric = new Gauge(metricConfig);
        break;
      case MetricType.HISTOGRAM:
        metric = new Histogram(metricConfig);
        break;
      case MetricType.SUMMARY:
        metric = new Summary(metricConfig);
        break;
      default:
        PrometheusMetricBuilder.historyTypes.delete(metricConfig.name);
        PrometheusMetricBuilder.historyMetrics.delete(metricConfig.name);

        throw new Error(`Не известный тип метрики (${usedType})`);
    }

    PrometheusMetricBuilder.historyMetrics.set(metricConfig.name, metric);
    PrometheusMetricBuilder.registry.registerMetric(metric);

    return metric;
  }
}
