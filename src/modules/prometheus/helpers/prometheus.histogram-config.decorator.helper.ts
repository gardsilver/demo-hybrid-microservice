import { IHistogramMetricConfig, IHistogramParams, IParamsPrometheusValue, PrometheusLabels } from '../types/types';
import { IHistogramConfig, IPrometheusParams } from '../types/decorators.type';
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

    let configObserve: Partial<IPrometheusParams<IHistogramMetricConfig, IHistogramParams>>;
    let configStartTimer: Partial<IPrometheusParams<IHistogramMetricConfig, IHistogramParams>>;

    if (config) {
      if (typeof config.observe === 'boolean') {
        configObserve = config.observe ? {} : undefined;
      } else {
        configObserve = config.observe;
      }

      if (typeof config.startTimer === 'boolean') {
        configStartTimer = config.startTimer ? {} : undefined;
      } else {
        configStartTimer = config.startTimer;
      }
    }

    const result: IHistogramConfig = {
      observe: configObserve
        ? {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              configObserve.metricConfig,
              defaultOptions,
              'Для метрики Histogram.observe не задан IHistogramMetricConfig!\n' +
                'Задайте опцию histogram.observe.metricConfig или определите histogram в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusHistogramConfigDecoratorHelper.buildParams(
              configObserve.params,
              defaultLabels,
              defaultParams,
              'Для метрики Histogram.observe не задан params.value!\n' +
                'Задайте опцию histogram.observe.params.value.',
            ),
          }
        : false,
      startTimer: configStartTimer
        ? {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              configStartTimer.metricConfig,
              defaultOptions,
              'Для метрики Histogram.startTimer не задан IHistogramMetricConfig!\n' +
                'Задайте опцию histogram.startTimer.metricConfig или определите histogram в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusHistogramConfigDecoratorHelper.buildParams(configStartTimer.params, defaultLabels),
          }
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
