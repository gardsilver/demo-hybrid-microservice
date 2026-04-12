import { IGaugeConfig, IPrometheusParams } from '../types/decorators.type';
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

    let configIncrement: Partial<IPrometheusParams<IGaugeMetricConfig, IGaugeParams>> | undefined;
    let configDecrement: Partial<IPrometheusParams<IGaugeMetricConfig, IGaugeParams>> | undefined;

    if (typeof config.increment === 'boolean') {
      configIncrement = config.increment ? {} : undefined;
    } else {
      configIncrement = config.increment;
    }

    if (typeof config.decrement === 'boolean') {
      configDecrement = config.decrement ? {} : undefined;
    } else {
      configDecrement = config.decrement;
    }

    const result: IGaugeConfig = {
      increment: configIncrement
        ? {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              configIncrement.metricConfig,
              defaultOptions,
              'Для метрики Gauge.increment не задан IGaugeMetricConfig!\n' +
                'Задайте опцию gauge.increment.metricConfig или определите gauge в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusGaugeConfigDecoratorHelper.buildParams(configIncrement.params, defaultLabels),
          }
        : false,

      decrement: configDecrement
        ? {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              configDecrement.metricConfig,
              defaultOptions,
              'Для метрики Gauge.decrement не задан IGaugeMetricConfig!\n' +
                'Задайте опцию gauge.decrement.metricConfig или определите gauge в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusGaugeConfigDecoratorHelper.buildParams(configDecrement.params, defaultLabels),
          }
        : false,
    };

    return result.increment === false && result.decrement === false ? false : result;
  }

  private static buildParams(
    params: IGaugeParams | undefined,
    defaultLabels: PrometheusLabels | false,
  ): IGaugeParams | undefined {
    let result: IGaugeParams | undefined;

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
