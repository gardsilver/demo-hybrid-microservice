import { ICounterMetricConfig } from 'src/modules/prometheus';

export const KAFKA_CONNECTION_RESTART: ICounterMetricConfig = {
  name: 'kafka_connection_restart',
  help: 'Количество запусков сценария restartOnFailure Kafka.',
  labelNames: ['service', 'errorType'],
};
