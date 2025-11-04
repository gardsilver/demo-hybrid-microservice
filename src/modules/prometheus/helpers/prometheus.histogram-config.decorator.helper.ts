import { IHistogramMetricConfig, IHistogramParams, IParamsPrometheusValue, PrometheusLabels } from '../types/types';
import { IHistogramConfig } from '../types/decorators.type';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';

export abstract class PrometheusHistogramConfigDecoratorHelper {
  public static build(
    config: false | IHistogramConfig | undefined,
    defaultOptions: false | IHistogramMetricConfig,
    defaultLabels: PrometheusLabels | false,
    defaultParams?: IParamsPrometheusValue & { end?: boolean },
  ): false | IHistogramConfig {
    if (!config && !defaultParams?.end) {
      return false;
    }

    const result: IHistogramConfig = {
      observe: config
        ? config.observe
          ? {
              metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
                config.observe.metricConfig,
                defaultOptions,
                'Для метрики Histogram.observe не задан IHistogramMetricConfig!\n' +
                  'Задайте опцию histogram.observe.metricConfig или определите histogram в декораторе PrometheusMetricConfigOnService.',
              ),
              params: PrometheusHistogramConfigDecoratorHelper.buildParams(
                config.observe.params,
                defaultLabels,
                defaultParams,
                'Для метрики Histogram.observe не задан params.value!\n' +
                  'Задайте опцию histogram.observe.params.value.',
              ),
            }
          : config.observe === undefined
            ? false
            : config.observe
        : false,
      startTimer: config
        ? config.startTimer
          ? {
              metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
                config.startTimer.metricConfig,
                defaultOptions,
                'Для метрики Histogram.startTimer не задан IHistogramMetricConfig!\n' +
                  'Задайте опцию histogram.startTimer.metricConfig или определите histogram в декораторе PrometheusMetricConfigOnService.',
              ),
              params: PrometheusHistogramConfigDecoratorHelper.buildParams(config.startTimer.params, defaultLabels),
            }
          : config.startTimer === undefined
            ? false
            : config.startTimer
        : false,

      end: defaultParams?.end === true ? (defaultLabels === false ? {} : { labels: defaultLabels }) : false,
    };

    return result.observe === false && result.startTimer === false && result.end === false ? false : result;
  }

  private static buildParams(
    params: IHistogramParams | undefined,
    defaultLabels: PrometheusLabels | false,
    defaultPrams?: IParamsPrometheusValue,
    required?: string,
  ): IHistogramParams {
    let result: IHistogramParams;

    if (params?.value !== undefined) {
      result = {
        value: params?.value,
      };
    } else if (defaultPrams !== undefined) {
      result = {
        value: defaultPrams.value,
      };
    }

    if (required && result?.value === undefined) {
      throw new Error(required);
    }

    const labels = PrometheusDecoratorHelper.buildLabels(params?.labels, defaultLabels);

    if (labels !== undefined) {
      result = {
        ...result,
        labels,
      };
    }

    return result;
  }
}
