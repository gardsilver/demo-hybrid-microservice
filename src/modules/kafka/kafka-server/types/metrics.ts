import { ICounterMetricConfig } from 'src/modules/prometheus';

export const KAFKA_CONNECTION_STATUS: ICounterMetricConfig = {
  name: 'kafka_connection_status',
  help: 'Количество изменений статуса соединения Kafka.',
  labelNames: ['service', 'topics', 'method', 'status'],
};

export const KAFKA_HANDLE_MESSAGE: ICounterMetricConfig = {
  name: 'kafka_handle_message',
  help: 'Количество полученных сообщений Kafka.',
  labelNames: ['service', 'topics', 'method'],
};

export const KAFKA_HANDLE_MESSAGE_FAILED: ICounterMetricConfig = {
  name: 'kafka_handle_message_filed',
  help: 'Количество не обработанных сообщений Kafka из-за возникновения ошибок.',
  labelNames: ['service', 'topics', 'method', 'errorType'],
};
