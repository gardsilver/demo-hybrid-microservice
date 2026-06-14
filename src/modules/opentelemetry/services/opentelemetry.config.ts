import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import { GracefulShutdownConfig } from 'src/modules/graceful-shutdown/services/graceful-shutdown.config';
import { PrometheusConfig } from 'src/modules/prometheus/services/prometheus.config';

export class OpentelemetryConfig {
  private readonly gracefulShutdownConfig: GracefulShutdownConfig;
  private readonly prometheusConfig: PrometheusConfig;
  private readonly url: string;

  constructor(configService: ConfigService) {
    this.gracefulShutdownConfig = new GracefulShutdownConfig(configService);
    this.prometheusConfig = new PrometheusConfig(configService);

    const configServiceHelper = new ConfigServiceHelper(configService, 'OPENTELEMETRY_');

    this.url = configService.get(configServiceHelper.getKeyName('URL'), '').trim();
  }

  getUrl(): string {
    return this.url ? this.url : 'http://localhost:4318/v1/traces';
  }

  getDestroySignal(): string {
    return this.gracefulShutdownConfig.getDestroySignal();
  }

  getApplicationName(): string | undefined {
    return this.prometheusConfig.getApplicationName();
  }

  getMicroserviceName(): string | undefined {
    return this.prometheusConfig.getMicroserviceName();
  }

  getMicroserviceVersion(): string | undefined {
    return this.prometheusConfig.getMicroserviceVersion();
  }
}
