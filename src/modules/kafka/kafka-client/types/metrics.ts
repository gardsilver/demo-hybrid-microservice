import { ICounterMetricConfig, IHistogramMetricConfig, REQUEST_BUCKETS } from 'src/modules/prometheus';

export const KAFKA_EXTERNAL_REQUEST_DURATIONS: IHistogramMetricConfig = {
  name: 'kafka_external_request_durations',
  help: 'Гистограмма длительностей отправки запросов Kafka и их количество.',
  labelNames: ['service', 'topics', 'method'],
  buckets: REQUEST_BUCKETS,
};

export const KAFKA_EXTERNAL_REQUEST_FAILED: ICounterMetricConfig = {
  name: 'kafka_external_request_failed',
  help: 'Количество отправленных запросов Kafka с ошибками.',
  labelNames: ['service', 'topics', 'method', 'statusCode', 'type'],
};
