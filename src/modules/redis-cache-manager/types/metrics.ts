import { ICounterMetricConfig } from 'src/modules/prometheus';

export const REDIS_CLIENT_RECONNECT_FAILED: ICounterMetricConfig = {
  name: 'redis_client_reconnect_filed',
  help: 'Количество не удавшихся переподключений к Redis.',
  labelNames: [],
};
