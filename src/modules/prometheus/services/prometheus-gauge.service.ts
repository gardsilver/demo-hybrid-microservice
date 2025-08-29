import { Gauge } from 'prom-client';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { MetricType, IGaugeService, IGaugeMetricConfig, PrometheusLabels, IGaugeMetricValues } from '../types/types';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';

@Injectable()
export class PrometheusGaugeService implements IGaugeService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly metricBuilder: PrometheusMetricBuilder,
  ) {}

  increment(
    metricConfig: IGaugeMetricConfig,
    params: {
      labels?: PrometheusLabels;
      value: number;
    },
  ): void {
    const logger = this.loggerBuilder.build({ module: `${PrometheusGaugeService.name}.${this.increment.name}` });

    const metric = this.metricBuilder.build(metricConfig, MetricType.GAUGE) as Gauge;

    try {
      if (params?.labels) {
        metric.inc(params.labels, params.value);
      } else {
        metric.inc(params.value);
      }
    } catch (error) {
      logger.error('Prometheus fail', {
        payload: {
          metricConfig,
          params,
          error,
        },
        markers: ['prometheus', LoggerMarkers.ERROR],
      });
    }
  }

  decrement(
    metricConfig: IGaugeMetricConfig,
    params: {
      labels?: PrometheusLabels;
      value: number;
    },
  ): void {
    const logger = this.loggerBuilder.build({ module: `${PrometheusGaugeService.name}.${this.decrement.name}` });

    const metric = this.metricBuilder.build(metricConfig, MetricType.GAUGE) as Gauge;

    try {
      if (params?.labels) {
        metric.dec(params.labels, params.value);
      } else {
        metric.dec(params.value);
      }
    } catch (error) {
      logger.error('Prometheus fail', {
        payload: {
          metricConfig,
          params,
          error,
        },
        markers: ['prometheus', LoggerMarkers.ERROR],
      });
    }
  }

  public async get(metricConfig: IGaugeMetricConfig): Promise<IGaugeMetricValues> {
    const logger = this.loggerBuilder.build({ module: `${PrometheusGaugeService.name}.${this.get.name}` });
    const metric = this.metricBuilder.build(metricConfig, MetricType.GAUGE) as Gauge;
    try {
      return await metric.get();
    } catch (error) {
      logger.error('Prometheus fail', {
        payload: {
          metricConfig,
          error,
        },
        markers: ['prometheus', LoggerMarkers.ERROR],
      });
    }
  }
}
