import { Summary } from 'prom-client';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { MetricType, ISummaryService, ISummaryMetricConfig, PrometheusLabels } from '../types/types';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';

@Injectable()
export class PrometheusSummaryService implements ISummaryService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly metricBuilder: PrometheusMetricBuilder,
  ) {}

  observe(
    metricConfig: ISummaryMetricConfig,
    params: {
      labels?: PrometheusLabels;
      value: number;
    },
  ): void {
    const logger = this.loggerBuilder.build({ module: `${PrometheusSummaryService.name}.${this.observe.name}` });

    const metric = this.metricBuilder.build(metricConfig, MetricType.SUMMARY) as Summary;

    try {
      if (params?.labels) {
        metric.observe(params.labels, params.value);
      } else {
        metric.observe(params.value);
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

  startTimer(
    metricConfig: ISummaryMetricConfig,
    params?: {
      labels?: PrometheusLabels;
    },
  ): (labels?: PrometheusLabels) => number {
    const logger = this.loggerBuilder.build({ module: `${PrometheusSummaryService.name}.${this.startTimer.name}` });

    const metric = this.metricBuilder.build(metricConfig, MetricType.SUMMARY) as Summary;

    try {
      return metric.startTimer(params?.labels);
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
}
