import { PrometheusMetricConfig } from '../decorators/prometheus.metric-config.on-service';
import { IPrometheusEventConfig } from '../types/decorators.type';
import { IParamsPrometheusValue, PrometheusLabels } from '../types/types';
import { PrometheusCounterConfigDecoratorHelper } from './prometheus.counter-config.decorator.helper';
import { PrometheusGaugeConfigDecoratorHelper } from './prometheus.gauge-config.decorator.helper';
import { PrometheusHistogramConfigDecoratorHelper } from './prometheus.histogram-config.decorator.helper';
import { PrometheusSummaryConfigDecoratorHelper } from './prometheus.summary-config.decorator.helper';

export abstract class PrometheusEventConfigDecoratorHelper {
  public static build(
    config: IPrometheusEventConfig | false,
    defaultPrometheusMetricConfig: PrometheusMetricConfig,
    defaultLabels: PrometheusLabels | false,
    defaultPrams?: {
      histogram?: IParamsPrometheusValue & { end?: boolean };
      summary?: IParamsPrometheusValue & { end?: boolean };
    },
  ): IPrometheusEventConfig {
    if (config === false && !defaultPrams?.histogram?.end && !defaultPrams?.summary?.end) {
      return {};
    }

    return {
      counter: config
        ? PrometheusCounterConfigDecoratorHelper.build(
            config?.counter,
            defaultPrometheusMetricConfig.counter,
            defaultLabels,
          )
        : false,
      gauge: config
        ? PrometheusGaugeConfigDecoratorHelper.build(config?.gauge, defaultPrometheusMetricConfig.gauge, defaultLabels)
        : false,
      histogram:
        config || defaultPrams?.histogram?.end
          ? PrometheusHistogramConfigDecoratorHelper.build(
              config ? config?.histogram : false,
              defaultPrometheusMetricConfig.histogram,
              defaultLabels,
              defaultPrams?.histogram,
            )
          : false,
      summary:
        config || defaultPrams?.summary?.end
          ? PrometheusSummaryConfigDecoratorHelper.build(
              config ? config?.summary : false,
              defaultPrometheusMetricConfig.summary,
              defaultLabels,
              defaultPrams?.summary,
            )
          : false,
      custom: config ? config.custom : false,
    };
  }
}
