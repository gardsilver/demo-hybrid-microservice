import { faker } from '@faker-js/faker';
import { IMetricConfig, PrometheusLabels } from '../types/types';
import { PrometheusDecoratorHelper } from './prometheus.decorator.helper';

describe(PrometheusDecoratorHelper.name, () => {
  let defaultLabels: PrometheusLabels;
  let defaultMetricConfig: IMetricConfig;
  let errorMessage: string;

  beforeEach(async () => {
    defaultLabels = {
      service: faker.string.alpha(5),
    };

    defaultMetricConfig = {
      name: faker.string.alpha(5),
      help: faker.string.alpha(5),
      labelNames: ['service'],
    };

    errorMessage = faker.string.alpha(5);
  });

  it('buildLabels', async () => {
    const inputLabels: PrometheusLabels = {
      method: faker.string.alpha(5),
    };

    let labels = PrometheusDecoratorHelper.buildLabels(undefined, false);
    expect(labels).toBeUndefined();

    labels = PrometheusDecoratorHelper.buildLabels(inputLabels, false);
    expect(labels).toEqual(inputLabels);

    labels = PrometheusDecoratorHelper.buildLabels(inputLabels, defaultLabels);
    expect(labels).toEqual({ ...inputLabels, ...defaultLabels });
  });

  it('buildMetricConfig', async () => {
    const inputMetricConfig: IMetricConfig = {
      name: faker.string.alpha(5),
      help: faker.string.alpha(5),
      labelNames: ['method'],
    };

    let metricConfig;

    try {
      metricConfig = PrometheusDecoratorHelper.buildMetricConfig(undefined, false, errorMessage);
    } catch (e) {
      metricConfig = e;
    }

    expect(metricConfig instanceof Error).toBeTruthy();
    expect(metricConfig.message).toBe(errorMessage);

    metricConfig = PrometheusDecoratorHelper.buildMetricConfig(undefined, defaultMetricConfig, errorMessage);

    expect(metricConfig).toEqual(defaultMetricConfig);

    metricConfig = PrometheusDecoratorHelper.buildMetricConfig(inputMetricConfig, false, errorMessage);

    expect(metricConfig).toEqual(inputMetricConfig);

    metricConfig = PrometheusDecoratorHelper.buildMetricConfig(inputMetricConfig, defaultMetricConfig, errorMessage);

    expect(metricConfig).toEqual(inputMetricConfig);
  });
});
