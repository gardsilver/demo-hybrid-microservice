/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';
import { ICounterMetricConfig, PrometheusLabels } from '../types/types';
import { ICounterConfig } from '../types/decorators.type';
import { PrometheusCounterConfigDecoratorHelper } from './prometheus.counter-config.decorator.helper';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';

describe(PrometheusCounterConfigDecoratorHelper.name, () => {
  let config: ICounterConfig;
  let defaultOptions: ICounterMetricConfig;
  let mockConfig: ICounterMetricConfig;
  let defaultLabels: PrometheusLabels;

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

    config = {
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
    };

    jest.clearAllMocks();
  });

  it('build as false', async () => {
    let result;

    result = PrometheusCounterConfigDecoratorHelper.build(undefined, false, false);
    expect(result).toBeFalsy();

    result = PrometheusCounterConfigDecoratorHelper.build(false, false, false);
    expect(result).toBeFalsy();

    config.increment = undefined;
    result = PrometheusCounterConfigDecoratorHelper.build(config, false, false);
    expect(result).toBeFalsy();

    config.increment = false;
    result = PrometheusCounterConfigDecoratorHelper.build(config, false, false);
    expect(result).toBeFalsy();
  });

  it('build as success', async () => {
    let mockLabel = undefined;
    const spyConfig = jest.fn().mockImplementation(() => mockConfig);
    const spyLabel = jest.fn().mockImplementation(() => mockLabel);

    PrometheusDecoratorHelper.buildMetricConfig = spyConfig;
    PrometheusDecoratorHelper.buildLabels = spyLabel;

    let result;

    result = PrometheusCounterConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(spyConfig).toHaveBeenCalledWith(
      (config.increment as any).metricConfig,
      defaultOptions,
      'Для метрики Counter.increment не задан ICounterMetricConfig!\n' +
        'Задайте опцию counter.increment.metricConfig или определите counter в декораторе PrometheusMetricConfigOnService.',
    );

    expect(spyLabel).toHaveBeenCalledWith((config.increment as any).params.labels, defaultLabels);

    expect(result).toEqual({
      increment: {
        metricConfig: mockConfig,
        params: {
          ...(config.increment as any).params,
          labels: undefined,
        },
      },
    });

    (config.increment as any).params.value = undefined;
    result = PrometheusCounterConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(result).toEqual({
      increment: {
        metricConfig: mockConfig,
        params: undefined,
      },
    });

    (config.increment as any).params.value = faker.number.int(10);
    mockLabel = {
      status: faker.string.alpha(5),
    };
    result = PrometheusCounterConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(result).toEqual({
      increment: {
        metricConfig: mockConfig,
        params: {
          ...(config.increment as any).params,
          labels: mockLabel,
        },
      },
    });
  });
});
