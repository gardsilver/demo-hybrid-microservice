import { ICounterMetricConfig, IHistogramMetricConfig, REQUEST_BUCKETS } from 'src/modules/prometheus';

export const HTTP_EXTERNAL_REQUEST_DURATIONS: IHistogramMetricConfig = {
  name: 'http_external_request_durations',
  help: 'Гистограмма длительностей запросов по HTTP к внешним системам и их количество.',
  labelNames: ['method', 'hostname', 'pathname'],
  buckets: REQUEST_BUCKETS,
};

export const HTTP_EXTERNAL_REQUEST_FAILED: ICounterMetricConfig = {
  name: 'http_external_request_failed',
  help: 'Количество запросов по HTTP к внешним системам с ошибками.',
  labelNames: ['method', 'hostname', 'pathname', 'statusCode', 'type'],
};

export const HTTP_EXTERNAL_REQUEST_RETRY: ICounterMetricConfig = {
  name: 'http_external_request_retry',
  help: 'Количество повторных запросов по HTTP к внешним системам.',
  labelNames: ['method', 'hostname', 'pathname', 'statusCode', 'type'],
};
