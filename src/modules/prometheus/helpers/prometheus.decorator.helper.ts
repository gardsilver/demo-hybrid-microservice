import { IMetricConfig, PrometheusLabels } from '../types/types';

export abstract class PrometheusDecoratorHelper {
  public static buildLabels(
    labels: PrometheusLabels | undefined,
    defaultLabels: PrometheusLabels | false,
  ): PrometheusLabels | undefined {
    if (labels === undefined && defaultLabels === false) {
      return undefined;
    }

    return {
      ...(defaultLabels === false ? {} : defaultLabels),
      ...labels,
    };
  }

  public static buildMetricConfig<M = IMetricConfig>(
    metricConfig: M | undefined,
    defaultConfig: M | false,
    errorMessage: string,
  ): M {
    let result: M;

    if (metricConfig) {
      result = metricConfig;
    } else {
      if (defaultConfig === false) {
        throw new Error(errorMessage);
      }

      result = defaultConfig;
    }

    return result;
  }
}
