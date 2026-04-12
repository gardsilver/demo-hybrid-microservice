/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';
import { PrometheusSummaryConfigDecoratorHelper } from './prometheus.summary-config.decorator.helper';
import { ISummaryConfig } from '../types/decorators.type';
import { ISummaryMetricConfig, IParamsPrometheusValue, PrometheusLabels } from '../types/types';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';

describe(PrometheusSummaryConfigDecoratorHelper.name, () => {
  let config: ISummaryConfig;
  let defaultOptions: ISummaryMetricConfig;
  let mockConfig: ISummaryMetricConfig;
  let defaultLabels: PrometheusLabels;
  let defaultParams: IParamsPrometheusValue & { end?: boolean };

  beforeEach(async () => {
    defaultOptions = {
      name: faker.string.alpha(5),
      help: faker.string.alpha(5),
      labelNames: ['service'],
    };

    mockConfig = {
      name: faker.string.alpha(5),
      help: faker.string.alpha(5),
      labelNames: ['status'],
    };

    defaultLabels = {
      service: faker.string.alpha(5),
    };

    defaultParams = {
      value: faker.number.int(5),
      end: false,
    };

    config = {
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
    };

    jest.clearAllMocks();
  });

  it('build as false', async () => {
    let result: false | ISummaryConfig;

    result = PrometheusSummaryConfigDecoratorHelper.build(undefined, false, false);
    expect(result).toBeFalsy();

    result = PrometheusSummaryConfigDecoratorHelper.build(false, false, false);
    expect(result).toBeFalsy();

    config.observe = false;
    config.startTimer = false;
    config.end = false;
    result = PrometheusSummaryConfigDecoratorHelper.build(config, false, false);
    expect(result).toBeFalsy();

    config.observe = undefined;
    config.startTimer = undefined;
    config.end = undefined;
    result = PrometheusSummaryConfigDecoratorHelper.build(config, false, false);
    expect(result).toBeFalsy();

    defaultParams.end = true;
    result = PrometheusSummaryConfigDecoratorHelper.build(config, false, false, defaultParams);
    expect(result).toEqual({
      observe: false,
      startTimer: false,
      end: {},
    });

    result = PrometheusSummaryConfigDecoratorHelper.build(config, false, defaultLabels, defaultParams);
    expect(result).toEqual({
      observe: false,
      startTimer: false,
      end: { labels: defaultLabels },
    });

    result = PrometheusSummaryConfigDecoratorHelper.build(undefined, false, defaultLabels, defaultParams);
    expect(result).toEqual({
      observe: false,
      startTimer: false,
      end: { labels: defaultLabels },
    });

    result = PrometheusSummaryConfigDecoratorHelper.build(false, false, defaultLabels, defaultParams);
    expect(result).toEqual({
      observe: false,
      startTimer: false,
      end: { labels: defaultLabels },
    });
  });

  it('build as success', async () => {
    let mockLabel: PrometheusLabels | undefined = undefined;
    const spyConfig = jest.fn().mockImplementation(() => mockConfig);
    const spyLabel = jest.fn().mockImplementation(() => mockLabel);

    PrometheusDecoratorHelper.buildMetricConfig = spyConfig;
    PrometheusDecoratorHelper.buildLabels = spyLabel;

    let result: false | ISummaryConfig | Error;

    result = PrometheusSummaryConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(spyConfig).toHaveBeenCalledWith(
      (config.observe as any).metricConfig,
      defaultOptions,
      'Для метрики Summary.observe не задан ISummaryMetricConfig!\n' +
        'Задайте опцию summary.observe.metricConfig или определите summary в декораторе PrometheusMetricConfigOnService.',
    );

    expect(spyConfig).toHaveBeenCalledWith(
      (config.startTimer as any).metricConfig,
      defaultOptions,
      'Для метрики Summary.startTimer не задан ISummaryMetricConfig!\n' +
        'Задайте опцию summary.startTimer.metricConfig или определите summary в декораторе PrometheusMetricConfigOnService.',
    );

    expect(spyLabel).toHaveBeenCalledWith((config.observe as any).params.labels, defaultLabels);
    expect(spyLabel).toHaveBeenCalledWith((config.startTimer as any).params.labels, defaultLabels);

    expect(result).toEqual({
      observe: {
        metricConfig: mockConfig,
        params: {
          ...(config.observe as any).params,
          labels: undefined,
        },
      },
      startTimer: {
        metricConfig: mockConfig,
        params: {
          ...(config.startTimer as any).params,
          labels: undefined,
        },
      },
      end: false,
    });

    (config.observe as any).params.value = undefined;
    (config.startTimer as any).params.value = undefined;
    try {
      result = PrometheusSummaryConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    } catch (e) {
      result = e as Error;
    }

    expect(result instanceof Error).toBeTruthy();
    expect((result as Error).message).toBe(
      'Для метрики Summary.observe не задан params.value!\n' + 'Задайте опцию summary.observe.params.value.',
    );

    result = PrometheusSummaryConfigDecoratorHelper.build(config, defaultOptions, defaultLabels, {
      ...defaultParams,
      end: false,
    });
    expect(result).toEqual({
      observe: {
        metricConfig: mockConfig,
        params: {
          ...(config.observe as any).params,
          labels: mockLabel,
          value: defaultParams.value,
        },
      },
      startTimer: {
        metricConfig: mockConfig,
        params: undefined,
      },
      end: false,
    });

    (config.observe as any).params.value = faker.number.int(10);
    result = PrometheusSummaryConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(result).toEqual({
      observe: {
        metricConfig: mockConfig,
        params: {
          ...(config.observe as any).params,
          labels: mockLabel,
        },
      },
      startTimer: {
        metricConfig: mockConfig,
        params: undefined,
      },
      end: false,
    });

    (config.observe as any).params.value = faker.number.int(10);
    (config.startTimer as any).params.value = faker.number.int(10);
    mockLabel = {
      status: faker.string.alpha(5),
    };
    result = PrometheusSummaryConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(result).toEqual({
      observe: {
        metricConfig: mockConfig,
        params: {
          ...(config.observe as any).params,
          labels: mockLabel,
        },
      },
      startTimer: {
        metricConfig: mockConfig,
        params: {
          ...(config.startTimer as any).params,
          labels: mockLabel,
        },
      },
      end: false,
    });

    config.observe = true;
    config.startTimer = true;
    result = PrometheusSummaryConfigDecoratorHelper.build(config, defaultOptions, defaultLabels, defaultParams);
    expect(result).toEqual({
      observe: {
        metricConfig: mockConfig,
        params: {
          labels: mockLabel,
          value: defaultParams.value,
        },
      },
      startTimer: {
        metricConfig: mockConfig,
        params: {
          labels: mockLabel,
        },
      },
      end: false,
    });
  });
});
