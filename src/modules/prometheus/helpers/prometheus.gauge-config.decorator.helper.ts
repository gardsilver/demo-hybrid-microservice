import { IGaugeConfig } from '../types/decorators.type';
import { IGaugeMetricConfig, IGaugeParams, PrometheusLabels } from '../types/types';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';

export abstract class PrometheusGaugeConfigDecoratorHelper {
  public static build(
    config: false | IGaugeConfig | undefined,
    defaultOptions: false | IGaugeMetricConfig,
    defaultLabels: PrometheusLabels | false,
  ): false | IGaugeConfig {
    if (!config) {
      return false;
    }

    const result: IGaugeConfig = {
      increment: config.increment
        ? {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              config.increment.metricConfig,
              defaultOptions,
              'Для метрики Gauge.increment не задан IGaugeMetricConfig!\n' +
                'Задайте опцию gauge.increment.metricConfig или определите gauge в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusGaugeConfigDecoratorHelper.buildParams(config.increment.params, defaultLabels),
          }
        : config.increment === undefined
          ? false
          : config.increment,

      decrement: config.decrement
        ? {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              config.decrement.metricConfig,
              defaultOptions,
              'Для метрики Gauge.decrement не задан IGaugeMetricConfig!\n' +
                'Задайте опцию gauge.decrement.metricConfig или определите gauge в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusGaugeConfigDecoratorHelper.buildParams(config.decrement.params, defaultLabels),
          }
        : config.decrement === undefined
          ? false
          : config.decrement,
    };

    return result.increment === false && result.decrement === false ? false : result;
  }

  private static buildParams(params: IGaugeParams | undefined, defaultLabels: PrometheusLabels | false): IGaugeParams {
    let result: IGaugeParams;

    const labels = PrometheusDecoratorHelper.buildLabels(params?.labels, defaultLabels);

    if (labels !== undefined || params?.value !== undefined) {
      result = {
        labels,
        value: params?.value,
      };
    }

    return result;
  }
}
