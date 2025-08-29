import {
  ICounterMetricConfig,
  IGaugeMetricConfig,
  IHistogramMetricConfig,
  ISummaryMetricConfig,
  REQUEST_BUCKETS,
  REQUEST_PERCENTILES,
} from 'src/modules/prometheus';

export const METRIC_COUNTER: ICounterMetricConfig = {
  name: 'metric_counter',
  help: 'Тестовая метрика Counter.',
  labelNames: ['service', 'method'],
};

export const METRIC_GAUGE: IGaugeMetricConfig = {
  name: 'metric_gauge',
  help: 'Тестовая метрика Gauge.',
  labelNames: ['service', 'method'],
};

export const METRIC_HISTOGRAM: IHistogramMetricConfig = {
  name: 'metric_histogram',
  help: 'Тестовая метрика Histogram',
  labelNames: ['service', 'method'],
  buckets: REQUEST_BUCKETS,
};

export const METRIC_SUMMARY: ISummaryMetricConfig = {
  name: 'metric_summary',
  help: 'Тестовая метрика Summary',
  labelNames: ['service', 'method'],
  percentiles: REQUEST_PERCENTILES,
};
