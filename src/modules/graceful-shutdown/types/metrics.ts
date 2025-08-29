import {
  ICounterMetricConfig,
  IGaugeMetricConfig,
  IHistogramMetricConfig,
  REQUEST_BUCKETS,
} from 'src/modules/prometheus';

export const UNCAUGHT_EXCEPTION_COUNT: ICounterMetricConfig = {
  name: 'uncaught_exception_count',
  help: 'Количество не обработанных ошибок',
  labelNames: ['type', 'module', 'file'],
};

export const UNCAUGHT_REJECTION_COUNT: ICounterMetricConfig = {
  name: 'uncaught_rejection_count',
  help: 'Количество не обработанных Promise rejections',
  labelNames: ['reason', 'type', 'module', 'file'],
};

export const GRACEFUL_SHUTDOWN_DURATIONS: IHistogramMetricConfig = {
  name: 'graceful_shutdown_durations',
  help: 'Гистограмма длительности плавного завершения приложения.',
  labelNames: ['service', 'signal'],
  buckets: REQUEST_BUCKETS,
};

export const GRACEFUL_SHUTDOWN_FAILED: ICounterMetricConfig = {
  name: 'graceful_shutdown_failed',
  help: 'Количество не удачных завершений работы приложения.',
  labelNames: ['service', 'signal'],
};

export const ACTIVE_METHODS_GAUGE: IGaugeMetricConfig = {
  name: 'active_methods_gauge',
  help: 'Количество активных процессов',
  labelNames: ['service', 'method'],
};

export const ACTIVE_METHODS_DURATIONS: IHistogramMetricConfig = {
  name: 'active_methods_durations',
  help: 'Гистограмма длительности выполнения активных процессов.',
  labelNames: ['service', 'method'],
  buckets: REQUEST_BUCKETS,
};

export const ACTIVE_METHODS_FAILED: ICounterMetricConfig = {
  name: 'active_methods_failed',
  help: 'Количество активных процессов завершенных с ошибкой.',
  labelNames: ['service', 'method'],
};
