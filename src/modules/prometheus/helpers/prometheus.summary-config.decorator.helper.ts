import { IPrometheusParams, ISummaryConfig } from '../types/decorators.type';
import { ISummaryMetricConfig, ISummaryParams, IParamsPrometheusValue, PrometheusLabels } from '../types/types';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';

export abstract class PrometheusSummaryConfigDecoratorHelper {
  public static build(
    config: false | ISummaryConfig | undefined,
    defaultOptions: false | ISummaryMetricConfig,
    defaultLabels: PrometheusLabels | false,
    defaultParams?: IParamsPrometheusValue & { end?: boolean },
  ): false | ISummaryConfig {
    if (!config && !defaultParams?.end) {
      return false;
    }

    let configObserve: Partial<IPrometheusParams<ISummaryMetricConfig, ISummaryParams>>;
    let configStartTimer: Partial<IPrometheusParams<ISummaryMetricConfig, ISummaryParams>>;

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

    const result: ISummaryConfig = {
      observe: configObserve
        ? {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              configObserve.metricConfig,
              defaultOptions,
              'Для метрики Summary.observe не задан ISummaryMetricConfig!\n' +
                'Задайте опцию summary.observe.metricConfig или определите summary в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusSummaryConfigDecoratorHelper.buildParams(
              configObserve.params,
              defaultLabels,
              defaultParams,
              'Для метрики Summary.observe не задан params.value!\n' + 'Задайте опцию summary.observe.params.value.',
            ),
          }
        : false,

      startTimer: configStartTimer
        ? {
            metricConfig: PrometheusDecoratorHelper.buildMetricConfig(
              configStartTimer.metricConfig,
              defaultOptions,
              'Для метрики Summary.startTimer не задан ISummaryMetricConfig!\n' +
                'Задайте опцию summary.startTimer.metricConfig или определите summary в декораторе PrometheusMetricConfigOnService.',
            ),
            params: PrometheusSummaryConfigDecoratorHelper.buildParams(configStartTimer.params, defaultLabels),
          }
        : false,
      end: defaultParams?.end === true ? (defaultLabels === false ? {} : { labels: defaultLabels }) : false,
    };

    return result.observe === false && result.startTimer === false && result.end === false ? false : result;
  }

  private static buildParams(
    params: ISummaryParams | undefined,
    defaultLabels: PrometheusLabels | false,
    defaultPrams?: IParamsPrometheusValue,
    required?: string,
  ): ISummaryParams {
    let result: ISummaryParams;

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
