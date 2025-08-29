import { ICounterMetricConfig, IHistogramMetricConfig, REQUEST_BUCKETS } from 'src/modules/prometheus';

export const GRPC_INTERNAL_REQUEST_DURATIONS: IHistogramMetricConfig = {
  name: 'grpc_internal_request_durations',
  help: 'Гистограмма длительностей выполнения серверных запросов gRPC и их количество.',
  labelNames: ['service', 'method'],
  buckets: REQUEST_BUCKETS,
};

export const GRPC_INTERNAL_REQUEST_FAILED: ICounterMetricConfig = {
  name: 'grpc_internal_request_failed',
  help: 'Количество серверных запросов gRPC с ошибками.',
  labelNames: ['service', 'method', 'statusCode'],
};
