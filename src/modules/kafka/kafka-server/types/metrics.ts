import { ICounterMetricConfig } from 'src/modules/prometheus';

export const KAFKA_CONNECTION_STATUS: ICounterMetricConfig = {
  name: 'kafka_connection_status',
  help: 'Количество изменений статуса соединения.',
  labelNames: ['service', 'status'],
};
