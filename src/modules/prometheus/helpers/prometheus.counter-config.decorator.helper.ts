import { ICounterConfig } from '../types/decorators.type';
import { ICounterMetricConfig, ICounterParams, PrometheusLabels } from '../types/types';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';

export abstract class PrometheusCounterConfigDecoratorHelper {
  public static build(
    config: false | ICounterConfig | undefined,
    defaultOptions: false | ICounterMetricConfig,
    defaultLabels: PrometheusLabels | false,
  ): false | ICounterConfig {
    if (!config || !config.increment) {
      return false;
    }

    return {
      increment: {
        metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
          config.increment.metricConfig,
          defaultOptions,
          'Для метрики Counter.increment не задан ICounterMetricConfig!\n' +
            'Задайте опцию counter.increment.metricConfig или определите counter в декораторе PrometheusMetricConfigOnService.',
        ),
        params: PrometheusCounterConfigDecoratorHelper.buildParams(config.increment.params, defaultLabels),
      },
    };
  }

  private static buildParams(
    params: ICounterParams | undefined,
    defaultLabels: PrometheusLabels | false,
  ): ICounterParams {
    let result: ICounterParams;

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
