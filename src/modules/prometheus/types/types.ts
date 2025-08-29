import { LabelValues } from 'prom-client';

export enum MetricType {
  COUNTER = 'Counter',
  GAUGE = 'Gauge',
  HISTOGRAM = 'Histogram',
  SUMMARY = 'Summary',
}

export type PrometheusLabels = LabelValues<string>;

export interface IMetricConfig {
  name: string;
  help: string;
  labelNames: string[];
}

export interface ICounterMetricConfig extends IMetricConfig {}
export interface ICounterMetricValues {
  name: string;
  help: string;
  values: {
    labels: PrometheusLabels;
    value: number;
  }[];
}

export interface ICounterService {
  increment(
    metricConfig: ICounterMetricConfig,
    params?: {
      labels?: PrometheusLabels;
      value?: number;
    },
  ): void;

  get(metricConfig: ICounterMetricConfig): Promise<ICounterMetricValues>;
}

export interface IGaugeMetricConfig extends IMetricConfig {}
export interface IGaugeMetricValues extends ICounterMetricValues {}

export interface IGaugeService {
  increment(
    metricConfig: IGaugeMetricConfig,
    params: {
      labels?: PrometheusLabels;
      value: number;
    },
  ): void;

  decrement(
    metricConfig: IGaugeMetricConfig,
    params: {
      labels?: PrometheusLabels;
      value: number;
    },
  ): void;

  get(metricConfig: IGaugeMetricConfig): Promise<IGaugeMetricValues>;
}

export interface IHistogramMetricConfig extends IMetricConfig {
  buckets?: number[];
}

export interface IHistogramService {
  observe(
    metricConfig: IHistogramMetricConfig,
    params: {
      labels?: PrometheusLabels;
      value: number;
    },
  ): void;

  startTimer(
    metricConfig: IHistogramMetricConfig,
    params?: {
      labels?: PrometheusLabels;
    },
  ): (labels?: PrometheusLabels) => number;
}

export interface ISummaryMetricConfig extends IMetricConfig {
  percentiles?: number[];
}

export interface ISummaryService {
  observe(
    metricConfig: ISummaryMetricConfig,
    params: {
      labels?: PrometheusLabels;
      value: number;
    },
  ): void;

  startTimer(
    metricConfig: ISummaryMetricConfig,
    params?: {
      labels?: PrometheusLabels;
    },
  ): (labels?: PrometheusLabels) => number;
}
