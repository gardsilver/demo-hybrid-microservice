import { ICounterMetricConfig, IHistogramMetricConfig, REQUEST_BUCKETS } from 'src/modules/prometheus';

export const RABBIT_MQ_EXTERNAL_REQUEST_DURATIONS: IHistogramMetricConfig = {
  name: 'rabbit_mq_external_request_durations',
  help: 'Гистограмма длительностей отправки запросов RabbitMq и их количество.',
  labelNames: ['service', 'queue', 'exchange', 'routing'],
  buckets: REQUEST_BUCKETS,
};

export const RABBIT_MQ_EXTERNAL_REQUEST_FAILED: ICounterMetricConfig = {
  name: 'rabbit_mq_external_request_failed',
  help: 'Количество отправленных запросов RabbitMq с ошибками.',
  labelNames: ['service', 'queue', 'exchange', 'routing', 'statusCode', 'type'],
};
