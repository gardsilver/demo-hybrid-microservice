import { faker } from '@faker-js/faker';
import { getPrometheusMetricConfig, PrometheusMetricConfigOnService } from './prometheus.metric-config.on-service';
import { IMetricConfig, PrometheusLabels } from '../types/types';

describe(PrometheusMetricConfigOnService.name, () => {
  let defaultLabels: PrometheusLabels;
  let defaultMetricConfig: IMetricConfig;

  beforeEach(async () => {
    defaultLabels = {
      service: faker.string.alpha(5),
    };

    defaultMetricConfig = {
      name: faker.string.alpha(5),
      help: faker.string.alpha(5),
      labelNames: ['service'],
    };
  });

  it('default', async () => {
    class TestEmptyService {}

    @PrometheusMetricConfigOnService()
    class TestService {}

    const serviceEmpty = new TestEmptyService();
    const service = new TestService();

    let params = getPrometheusMetricConfig(serviceEmpty);

    expect(params).toEqual({
      labels: false,
      counter: false,
      gauge: false,
      histogram: false,
      summary: false,
    });

    params = getPrometheusMetricConfig(service);

    expect(params).toEqual({
      labels: false,
      counter: false,
      gauge: false,
      histogram: false,
      summary: false,
    });
  });

  it('custom', async () => {
    @PrometheusMetricConfigOnService({
      labels: defaultLabels,
      counter: false,
      gauge: () => false,
      histogram: () => defaultMetricConfig,
      summary: defaultMetricConfig,
    })
    class TestService {}

    const service = new TestService();

    const params = getPrometheusMetricConfig(service);

    expect(params).toEqual({
      labels: defaultLabels,
      counter: false,
      gauge: false,
      histogram: defaultMetricConfig,
      summary: defaultMetricConfig,
    });
  });
});
