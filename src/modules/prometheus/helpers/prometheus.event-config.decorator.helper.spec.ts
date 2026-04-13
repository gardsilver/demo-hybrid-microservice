import { faker } from '@faker-js/faker';
import { PrometheusMetricConfig } from '../decorators/prometheus.metric-config.on-service';
import { IPrometheusEventConfig } from '../types/decorators.type';
import { IParamsPrometheusValue, PrometheusLabels } from '../types/types';
import { PrometheusEventConfigDecoratorHelper } from './prometheus.event-config.decorator.helper';
import { PrometheusCounterConfigDecoratorHelper } from './prometheus.counter-config.decorator.helper';
import { PrometheusGaugeConfigDecoratorHelper } from './prometheus.gauge-config.decorator.helper';
import { PrometheusHistogramConfigDecoratorHelper } from './prometheus.histogram-config.decorator.helper';
import { PrometheusSummaryConfigDecoratorHelper } from './prometheus.summary-config.decorator.helper';

describe(PrometheusEventConfigDecoratorHelper.name, () => {
  let spyCount: jest.Mock;
  let spyGauge: jest.Mock;
  let spyHistogram: jest.Mock;
  let spySummary: jest.Mock;
  let spyCustom: jest.Mock;
  let config: IPrometheusEventConfig;
  let defaultPrometheusMetricConfig: PrometheusMetricConfig;
  let defaultLabels: PrometheusLabels;
  let defaultPrams: {
    histogram: IParamsPrometheusValue & { end?: boolean };
    summary: IParamsPrometheusValue & { end?: boolean };
  };

  beforeEach(async () => {
    spyCount = jest.fn().mockImplementation(() => ({}));
    spyGauge = jest.fn().mockImplementation(() => ({}));
    spyHistogram = jest.fn().mockImplementation(() => ({}));
    spySummary = jest.fn().mockImplementation(() => ({}));
    spyCustom = jest.fn().mockImplementation(() => ({}));

    PrometheusCounterConfigDecoratorHelper.build = spyCount;
    PrometheusGaugeConfigDecoratorHelper.build = spyGauge;
    PrometheusHistogramConfigDecoratorHelper.build = spyHistogram;
    PrometheusSummaryConfigDecoratorHelper.build = spySummary;

    defaultPrometheusMetricConfig = {
      labels: {
        status: faker.string.alpha(5),
      },
      counter: {
        name: faker.string.alpha(5),
        help: faker.string.alpha(5),
        labelNames: ['service'],
      },
      gauge: {
        name: faker.string.alpha(5),
        help: faker.string.alpha(5),
        labelNames: ['service'],
      },
      histogram: {
        name: faker.string.alpha(5),
        help: faker.string.alpha(5),
        labelNames: ['service'],
      },
      summary: {
        name: faker.string.alpha(5),
        help: faker.string.alpha(5),
        labelNames: ['service'],
      },
    };

    defaultLabels = {
      service: faker.string.alpha(5),
    };

    defaultPrams = {
      histogram: {
        value: faker.number.int(5),
        end: false,
      },
      summary: {
        value: faker.number.int(5),
        end: false,
      },
    };

    config = {
      counter: {
        increment: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
      },
      gauge: {
        increment: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        decrement: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
      },
      histogram: {
        observe: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        startTimer: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        end: {
          labels: {
            status: faker.string.alpha(5),
          },
        },
      },
      summary: {
        observe: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        startTimer: {
          metricConfig: {
            name: faker.string.alpha(5),
            help: faker.string.alpha(5),
            labelNames: ['method'],
          },
          params: {
            labels: {
              method: faker.string.alpha(5),
            },
            value: faker.number.int(10),
          },
        },
        end: {
          labels: {
            status: faker.string.alpha(5),
          },
        },
      },
      custom: spyCustom,
    };

    jest.clearAllMocks();
  });

  it('build as false', async () => {
    let result;

    result = PrometheusEventConfigDecoratorHelper.build(false, defaultPrometheusMetricConfig, false, undefined);

    expect(result).toEqual({});

    result = PrometheusEventConfigDecoratorHelper.build(false, defaultPrometheusMetricConfig, false, defaultPrams);

    expect(result).toEqual({});

    defaultPrams.histogram.end = true;
    defaultPrams.summary.end = true;

    result = PrometheusEventConfigDecoratorHelper.build(
      false,
      defaultPrometheusMetricConfig,
      defaultLabels,
      defaultPrams,
    );

    expect(result).toEqual({
      counter: false,
      gauge: false,
      histogram: {},
      summary: {},
      custom: false,
    });

    expect(spyCount).toHaveBeenCalledTimes(0);
    expect(spyGauge).toHaveBeenCalledTimes(0);
    expect(spyHistogram).toHaveBeenCalledTimes(1);
    expect(spyHistogram).toHaveBeenCalledWith(
      false,
      defaultPrometheusMetricConfig.histogram,
      defaultLabels,
      defaultPrams.histogram,
    );
    expect(spySummary).toHaveBeenCalledTimes(1);
    expect(spySummary).toHaveBeenCalledWith(
      false,
      defaultPrometheusMetricConfig.summary,
      defaultLabels,
      defaultPrams?.summary,
    );
  });

  it('build as success', async () => {
    const result = PrometheusEventConfigDecoratorHelper.build(
      config,
      defaultPrometheusMetricConfig,
      defaultLabels,
      defaultPrams,
    );

    expect(result).toEqual({
      counter: {},
      gauge: {},
      histogram: {},
      summary: {},
      custom: config.custom,
    });

    expect(spyCount).toHaveBeenCalledTimes(1);
    expect(spyCount).toHaveBeenCalledWith(config.counter, defaultPrometheusMetricConfig.counter, defaultLabels);
    expect(spyGauge).toHaveBeenCalledTimes(1);
    expect(spyGauge).toHaveBeenCalledWith(config.gauge, defaultPrometheusMetricConfig.gauge, defaultLabels);
    expect(spyHistogram).toHaveBeenCalledTimes(1);
    expect(spyHistogram).toHaveBeenCalledWith(
      config.histogram,
      defaultPrometheusMetricConfig.histogram,
      defaultLabels,
      defaultPrams.histogram,
    );
    expect(spySummary).toHaveBeenCalledTimes(1);
    expect(spySummary).toHaveBeenCalledWith(
      config.summary,
      defaultPrometheusMetricConfig.summary,
      defaultLabels,
      defaultPrams?.summary,
    );
  });
});
