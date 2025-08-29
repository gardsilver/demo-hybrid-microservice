import { Registry } from 'prom-client';
import { Inject, Injectable } from '@nestjs/common';
import {
  PROMETHEUS_COUNTER_SERVICE_DI,
  PROMETHEUS_GAUGE_SERVICE_DI,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
  PROMETHEUS_SUMMARY_SERVICE_DI,
} from '../types/tokens';
import { ICounterService, IGaugeService, IHistogramService, ISummaryService } from '../types/types';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';

@Injectable()
export class PrometheusManager {
  constructor(
    private readonly metricBuilder: PrometheusMetricBuilder,
    @Inject(PROMETHEUS_COUNTER_SERVICE_DI) private readonly counterService: ICounterService,
    @Inject(PROMETHEUS_GAUGE_SERVICE_DI) private readonly gaugeService: IGaugeService,
    @Inject(PROMETHEUS_HISTOGRAM_SERVICE_DI) private readonly histogramService: IHistogramService,
    @Inject(PROMETHEUS_SUMMARY_SERVICE_DI) private readonly summaryService: ISummaryService,
  ) {}
  public counter(): ICounterService {
    return this.counterService;
  }

  public gauge(): IGaugeService {
    return this.gaugeService;
  }

  public histogram(): IHistogramService {
    return this.histogramService;
  }

  public summary(): ISummaryService {
    return this.summaryService;
  }

  public async getMetrics(): Promise<string> {
    return this.metricBuilder.getMetrics();
  }

  public getRegistry(): Registry {
    return this.metricBuilder.getRegistry();
  }

  public getRegistryMetricNames(): string[] {
    return this.metricBuilder.getRegistryMetricNames();
  }
}
