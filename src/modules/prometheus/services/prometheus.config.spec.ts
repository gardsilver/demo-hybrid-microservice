import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { PrometheusConfig } from './prometheus.config';

describe(PrometheusConfig.name, () => {
  let config: ConfigService;
  let prometheusConfig: PrometheusConfig;

  it('default', async () => {
    config = new MockConfigService() as undefined as ConfigService;
    prometheusConfig = new PrometheusConfig(config);

    expect({
      getApplicationName: prometheusConfig.getApplicationName(),
      getMicroserviceName: prometheusConfig.getMicroserviceName(),
      getMicroserviceVersion: prometheusConfig.getMicroserviceVersion(),
    }).toEqual({});
  });

  it('custom', async () => {
    config = new MockConfigService({
      APPLICATION_NAME: 'appName',
      MICROSERVICE_NAME: 'micName',
      MICROSERVICE_VERSION: 'micVer',
    }) as undefined as ConfigService;
    prometheusConfig = new PrometheusConfig(config);

    expect({
      getApplicationName: prometheusConfig.getApplicationName(),
      getMicroserviceName: prometheusConfig.getMicroserviceName(),
      getMicroserviceVersion: prometheusConfig.getMicroserviceVersion(),
    }).toEqual({
      getApplicationName: 'appName',
      getMicroserviceName: 'micName',
      getMicroserviceVersion: 'micVer',
    });
  });
});
