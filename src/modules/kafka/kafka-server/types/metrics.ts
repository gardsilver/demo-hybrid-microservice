import { ICounterMetricConfig } from 'src/modules/prometheus';

export const KAFKA_CONNECTION_STATUS: ICounterMetricConfig = {
  name: 'kafka_connection_status',
  help: 'Количество изменений статуса соединения Kafka.',
  labelNames: ['service', 'status'],
};

export const KAFKA_HANDLE_MESSAGE_SUCCESS: ICounterMetricConfig = {
  name: 'kafka_handle_message_success',
  help: 'Количество успешно обработанных сообщений Kafka.',
  labelNames: ['service', 'topics', 'method'],
};

export const KAFKA_HANDLE_MESSAGE_FAILED: ICounterMetricConfig = {
  name: 'kafka_handle_message_filed',
  help: 'Количество ошибок при обработке сообщений Kafka.',
  labelNames: ['service', 'topics', 'method', 'errorType'],
};
