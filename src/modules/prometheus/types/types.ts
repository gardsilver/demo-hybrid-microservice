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

export interface IParamsPrometheusLabels {
  labels: PrometheusLabels;
}

export interface IParamsPrometheusValue {
  value: number;
}

export interface ICounterMetricConfig extends IMetricConfig {}
export interface ICounterMetricValues {
  name: string;
  help: string;
  values: (IParamsPrometheusLabels & IParamsPrometheusValue)[];
}
export interface ICounterParams extends Partial<IParamsPrometheusLabels & IParamsPrometheusValue> {}

export interface ICounterService {
  increment(metricConfig: ICounterMetricConfig, params?: ICounterParams): void;

  get(metricConfig: ICounterMetricConfig): Promise<ICounterMetricValues | undefined>;
}

export interface IGaugeMetricConfig extends IMetricConfig {}
export interface IGaugeMetricValues extends ICounterMetricValues {}
export interface IGaugeParams extends ICounterParams {}

export interface IGaugeService {
  increment(metricConfig: IGaugeMetricConfig, params?: IGaugeParams): void;

  decrement(metricConfig: IGaugeMetricConfig, params?: IGaugeParams): void;

  get(metricConfig: IGaugeMetricConfig): Promise<IGaugeMetricValues | undefined>;
}

export interface IHistogramMetricConfig extends IMetricConfig {
  buckets?: number[];
}
export interface IHistogramParams extends Partial<IParamsPrometheusLabels>, IParamsPrometheusValue {}

export interface IHistogramService {
  observe(metricConfig: IHistogramMetricConfig, params: IHistogramParams): void;

  startTimer(
    metricConfig: IHistogramMetricConfig,
    params?: Partial<IParamsPrometheusLabels>,
  ): (labels?: PrometheusLabels) => number;
}

export interface ISummaryMetricConfig extends IMetricConfig {
  percentiles?: number[];
}
export interface ISummaryParams extends IHistogramParams {}

export interface ISummaryService {
  observe(metricConfig: ISummaryMetricConfig, params: ISummaryParams): void;

  startTimer(
    metricConfig: ISummaryMetricConfig,
    params?: Partial<IParamsPrometheusLabels>,
  ): (labels?: PrometheusLabels) => number;
}
