import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import { GracefulShutdownConfig } from 'src/modules/graceful-shutdown/services/graceful-shutdown.config';
import { PrometheusConfig } from 'src/modules/prometheus/services/prometheus.config';

@Injectable()
export class OpentelemetryConfig {
  private readonly gracefulShutdownConfig: GracefulShutdownConfig;
  private readonly prometheusConfig: PrometheusConfig;
  private readonly isEnabled: boolean;
  private readonly url: string;
  private readonly batchMaxQueueSize: number;
  private readonly batchScheduledDelay: number;
  private readonly forcedDurationThreshold: number;
  private readonly ignoredEndpoints: string[];

  constructor(configService: ConfigService) {
    this.gracefulShutdownConfig = new GracefulShutdownConfig(configService);
    this.prometheusConfig = new PrometheusConfig(configService);

    const configServiceHelper = new ConfigServiceHelper(configService, 'TELEMETRY_');

    this.isEnabled = configServiceHelper.parseBoolean('ENABLED');

    this.url = configService.get(configServiceHelper.getKeyName('COLLECTOR_URL'), '').trim();
    this.batchMaxQueueSize = configServiceHelper.parseInt('BATCH_MAX_QUEUE_SIZE', 2048);
    this.batchScheduledDelay = configServiceHelper.parseInt('BATCH_SCHEDULED_DELAY', 5000);
    this.forcedDurationThreshold = configServiceHelper.parseInt('FORCED_DURATION_THRESHOLD', 1500);
    this.ignoredEndpoints = configServiceHelper.parseArray('IGNORED_ENDPOINTS');
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
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

  getBatchMaxQueueSize(): number {
    return this.batchMaxQueueSize;
  }

  getBatchScheduledDelay(): number {
    return this.batchScheduledDelay;
  }

  getForcedDurationThreshold(): number {
    return this.forcedDurationThreshold;
  }

  getIgnoredEndpoints(): string[] {
    return this.ignoredEndpoints;
  }
}
