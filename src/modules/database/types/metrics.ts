import { ICounterMetricConfig, IHistogramMetricConfig, REQUEST_BUCKETS } from 'src/modules/prometheus';

export const DB_QUERY_DURATIONS: IHistogramMetricConfig = {
  name: 'db_query_durations',
  help: 'Гистограмма длительностей запросов к DataBase и их количество.',
  labelNames: ['service', 'method'],
  buckets: REQUEST_BUCKETS,
};

export const DB_QUERY_FAILED: ICounterMetricConfig = {
  name: 'db_query_failed',
  help: 'Количество не успешных запросов к DataBase.',
  labelNames: ['service', 'method'],
};
