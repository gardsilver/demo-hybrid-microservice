import { ICounterMetricConfig, IHistogramMetricConfig, REQUEST_BUCKETS } from 'src/modules/prometheus';

export const GRPC_EXTERNAL_REQUEST_DURATIONS: IHistogramMetricConfig = {
  name: 'grpc_external_request_durations',
  help: 'Гистограмма длительностей запросов по gRPC к внешним системам и их количество.',
  labelNames: ['service', 'method'],
  buckets: REQUEST_BUCKETS,
};

export const GRPC_EXTERNAL_REQUEST_FAILED: ICounterMetricConfig = {
  name: 'grpc_external_request_failed',
  help: 'Количество запросов по gRPC к внешним системам с ошибками.',
  labelNames: ['service', 'method', 'statusCode', 'type'],
};

export const GRPC_EXTERNAL_REQUEST_RETRY: ICounterMetricConfig = {
  name: 'grpc_external_request_retry',
  help: 'Количество повторных запросов по gRPC к внешним системам.',
  labelNames: ['service', 'method', 'statusCode', 'type'],
};
