import {
  ICounterMetricConfig,
  IGaugeMetricConfig,
  IHistogramMetricConfig,
  ISummaryMetricConfig,
  PrometheusLabels,
} from '../types/types';

export type PrometheusMetricConfig = {
  labels: false | PrometheusLabels;
  counter: false | ICounterMetricConfig;
  gauge: false | IGaugeMetricConfig;
  histogram: false | IHistogramMetricConfig;
  summary: false | ISummaryMetricConfig;
};

export type PrometheusMetricConfigBuilderParams = {
  labels?: (false | PrometheusLabels) | (() => false | PrometheusLabels);
  counter?: (false | ICounterMetricConfig) | (() => ICounterMetricConfig | false);
  gauge?: (false | IGaugeMetricConfig) | (() => IGaugeMetricConfig | false);
  histogram?: (false | IHistogramMetricConfig) | (() => IHistogramMetricConfig | false);
  summary?: (false | ISummaryMetricConfig) | (() => ISummaryMetricConfig | false);
};

export const PROMETHEUS_CONFIG_KEY = 'prometheusConfigKey';

abstract class PrometheusMetricConfigBuilder {
  public static build<C extends object>(options: (() => C | false) | (C | false) | undefined): C | false {
    if (options === undefined || options === false) {
      return false;
    }

    if (typeof options === 'function') {
      return options();
    }

    return options;
  }
}

export const PrometheusMetricConfigOnService = (option?: PrometheusMetricConfigBuilderParams): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(
      PROMETHEUS_CONFIG_KEY,
      {
        labels: PrometheusMetricConfigBuilder.build(option?.labels),
        counter: PrometheusMetricConfigBuilder.build(option?.counter),
        gauge: PrometheusMetricConfigBuilder.build(option?.gauge),
        histogram: PrometheusMetricConfigBuilder.build(option?.histogram),
        summary: PrometheusMetricConfigBuilder.build(option?.summary),
      } as PrometheusMetricConfig,
      target,
    );
  };
};

export const getPrometheusMetricConfig = (target: object): PrometheusMetricConfig => {
  const option: PrometheusMetricConfig = Reflect.getMetadata(PROMETHEUS_CONFIG_KEY, target.constructor);

  return {
    labels: false,
    counter: false,
    gauge: false,
    histogram: false,
    summary: false,
    ...option,
  };
};
