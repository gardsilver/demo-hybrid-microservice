import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusConfig } from './services/prometheus.config';
import { PrometheusMetricBuilder } from './builders/prometheus-metric.builder';
import {
  PROMETHEUS_COUNTER_SERVICE_DI,
  PROMETHEUS_GAUGE_SERVICE_DI,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
  PROMETHEUS_SUMMARY_SERVICE_DI,
} from './types/tokens';
import { PrometheusCounterService } from './services/prometheus-counter.service';
import { PrometheusGaugeService } from './services/prometheus-gauge.service';
import { PrometheusHistogramService } from './services/prometheus-histogram.service';
import { PrometheusSummaryService } from './services/prometheus-summary.service';
import { PrometheusManager } from './services/prometheus.manager';

@Module({
  imports: [ConfigModule, ElkLoggerModule],
  providers: [
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
  exports: [
    PROMETHEUS_COUNTER_SERVICE_DI,
    PROMETHEUS_GAUGE_SERVICE_DI,
    PROMETHEUS_HISTOGRAM_SERVICE_DI,
    PROMETHEUS_SUMMARY_SERVICE_DI,
    PrometheusManager,
  ],
})
export class PrometheusModule {}
