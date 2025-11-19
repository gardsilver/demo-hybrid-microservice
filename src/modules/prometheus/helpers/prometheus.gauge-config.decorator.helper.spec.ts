/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';
import { IGaugeMetricConfig, PrometheusLabels } from '../types/types';
import { IGaugeConfig } from '../types/decorators.type';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';
import { PrometheusGaugeConfigDecoratorHelper } from './prometheus.gauge-config.decorator.helper';

describe(PrometheusGaugeConfigDecoratorHelper.name, () => {
  let config: IGaugeConfig;
  let defaultOptions: IGaugeMetricConfig;
  let mockConfig: IGaugeMetricConfig;
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
    };

    jest.clearAllMocks();
  });

  it('build as false', async () => {
    let result;

    result = PrometheusGaugeConfigDecoratorHelper.build(undefined, false, false);
    expect(result).toBeFalsy();

    result = PrometheusGaugeConfigDecoratorHelper.build(false, false, false);
    expect(result).toBeFalsy();

    config.increment = undefined;
    config.decrement = undefined;
    result = PrometheusGaugeConfigDecoratorHelper.build(config, false, false);
    expect(result).toBeFalsy();

    config.increment = false;
    config.decrement = false;
    result = PrometheusGaugeConfigDecoratorHelper.build(config, false, false);
    expect(result).toBeFalsy();
  });

  it('build as success', async () => {
    let mockLabel = undefined;
    const spyConfig = jest.fn().mockImplementation(() => mockConfig);
    const spyLabel = jest.fn().mockImplementation(() => mockLabel);

    PrometheusDecoratorHelper.buildMetricConfig = spyConfig;
    PrometheusDecoratorHelper.buildLabels = spyLabel;

    let result;

    result = PrometheusGaugeConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(spyConfig).toHaveBeenCalledWith(
      (config.increment as any).metricConfig,
      defaultOptions,
      'Для метрики Gauge.increment не задан IGaugeMetricConfig!\n' +
        'Задайте опцию gauge.increment.metricConfig или определите gauge в декораторе PrometheusMetricConfigOnService.',
    );

    expect(spyConfig).toHaveBeenCalledWith(
      (config.decrement as any).metricConfig,
      defaultOptions,
      'Для метрики Gauge.decrement не задан IGaugeMetricConfig!\n' +
        'Задайте опцию gauge.decrement.metricConfig или определите gauge в декораторе PrometheusMetricConfigOnService.',
    );

    expect(spyLabel).toHaveBeenCalledWith((config.increment as any).params.labels, defaultLabels);
    expect(spyLabel).toHaveBeenCalledWith((config.decrement as any).params.labels, defaultLabels);

    expect(result).toEqual({
      increment: {
        metricConfig: mockConfig,
        params: {
          ...(config.increment as any).params,
          labels: undefined,
        },
      },
      decrement: {
        metricConfig: mockConfig,
        params: {
          ...(config.decrement as any).params,
          labels: undefined,
        },
      },
    });

    (config.increment as any).params.value = undefined;
    (config.decrement as any).params.value = undefined;
    result = PrometheusGaugeConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(result).toEqual({
      increment: {
        metricConfig: mockConfig,
        params: undefined,
      },
      decrement: {
        metricConfig: mockConfig,
        params: undefined,
      },
    });

    (config.increment as any).params.value = faker.number.int(10);
    (config.decrement as any).params.value = faker.number.int(10);
    mockLabel = {
      status: faker.string.alpha(5),
    };
    result = PrometheusGaugeConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(result).toEqual({
      increment: {
        metricConfig: mockConfig,
        params: {
          ...(config.increment as any).params,
          labels: mockLabel,
        },
      },
      decrement: {
        metricConfig: mockConfig,
        params: {
          ...(config.decrement as any).params,
          labels: mockLabel,
        },
      },
    });

    config.increment = true;
    config.decrement = true;
    result = PrometheusGaugeConfigDecoratorHelper.build(config, defaultOptions, defaultLabels);
    expect(result).toEqual({
      increment: {
        metricConfig: mockConfig,
        params: {
          labels: mockLabel,
        },
      },
      decrement: {
        metricConfig: mockConfig,
        params: {
          labels: mockLabel,
        },
      },
    });
  });
});
