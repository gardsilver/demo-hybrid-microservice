import { ICounterMetricConfig, IHistogramMetricConfig, REQUEST_BUCKETS } from 'src/modules/prometheus';

export const HTTP_INTERNAL_REQUEST_DURATIONS: IHistogramMetricConfig = {
  name: 'http_internal_request_durations',
  help: 'Гистограмма длительностей выполнения серверных запросов HTTP и их количество.',
  labelNames: ['method', 'service', 'pathname'],
  buckets: REQUEST_BUCKETS,
};

export const HTTP_INTERNAL_REQUEST_FAILED: ICounterMetricConfig = {
  name: 'http_internal_request_failed',
  help: 'Количество серверных запросов HTTP с ошибками.',
  labelNames: ['method', 'service', 'pathname', 'statusCode'],
};
