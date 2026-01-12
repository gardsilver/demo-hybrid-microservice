import { ICounterMetricConfig } from 'src/modules/prometheus';

export const RABBIT_MQ_SERVER_CONNECTION_STATUS: ICounterMetricConfig = {
  name: 'rabbit_mq_server_connection_status',
  help: 'Количество изменений статуса соединения RMQ.',
  labelNames: ['service', 'status'],
};

export const RABBIT_MQ_SERVER_CONNECTION_FAILED: ICounterMetricConfig = {
  name: 'rabbit_mq_server_connection_failed',
  help: 'Количество ошибок подключения к RMQ.',
  labelNames: ['service', 'errorType'],
};

export const RABBIT_MQ_HANDLE_MESSAGE: ICounterMetricConfig = {
  name: 'rabbit_mq_handle_message',
  help: 'Количество полученных сообщений RMQ.',
  labelNames: ['service', 'queue', 'exchange', 'routing'],
};

export const RABBIT_MQ_HANDLE_MESSAGE_FAILED: ICounterMetricConfig = {
  name: 'rabbit_mq_handle_message_failed',
  help: 'Количество не обработанных сообщений RMQ из-за возникновения ошибок.',
  labelNames: ['service', 'queue', 'exchange', 'routing', 'errorType'],
};
