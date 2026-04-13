import { ICounterConfig, IPrometheusParams } from '../types/decorators.type';
import { ICounterMetricConfig, ICounterParams, PrometheusLabels } from '../types/types';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';

export abstract class PrometheusCounterConfigDecoratorHelper {
  public static build(
    config: false | ICounterConfig | undefined,
    defaultOptions: false | ICounterMetricConfig,
    defaultLabels: PrometheusLabels | false,
  ): false | ICounterConfig {
    if (!config) {
      return false;
    }

    let configIncrement: Partial<IPrometheusParams<ICounterMetricConfig, ICounterParams>> | undefined;

    if (typeof config.increment === 'boolean') {
      configIncrement = config.increment ? {} : undefined;
    } else {
      configIncrement = config.increment;
    }

    return configIncrement
      ? {
          increment: {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              configIncrement.metricConfig,
              defaultOptions,
              'Для метрики Counter.increment не задан ICounterMetricConfig!\n' +
                'Задайте опцию counter.increment.metricConfig или определите counter в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusCounterConfigDecoratorHelper.buildParams(configIncrement.params, defaultLabels),
          },
        }
      : false;
  }

  private static buildParams(
    params: ICounterParams | undefined,
    defaultLabels: PrometheusLabels | false,
  ): ICounterParams | undefined {
    let result: ICounterParams | undefined;

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
