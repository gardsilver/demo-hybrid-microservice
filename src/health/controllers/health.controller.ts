import { Controller, Get, Inject } from '@nestjs/common';
import { ApiHeaders, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import {
  AUTH_SERVICE_DI,
  IAccessTokenData,
  AccessRoles,
  IAuthService,
  AUTH_CERTIFICATE_SERVICE_DI,
  ICertificateService,
  AuthHealthIndicatorService,
} from 'src/modules/auth';
import { SKIP_ALL, SkipInterceptors } from 'src/modules/common';
import { PrometheusManager } from 'src/modules/prometheus';
import { GracefulShutdownHealthIndicatorService } from 'src/modules/graceful-shutdown';
import { DatabaseHealthIndicator } from 'src/modules/database';
import { RedisCacheManagerHealthIndicator } from 'src/modules/redis-cache-manager';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { KafkaServerStatusService } from 'src/modules/kafka/kafka-server';
import { RabbitMqServerStatusService } from 'src/modules/rabbit-mq/rabbit-mq-server';

@SkipInterceptors(SKIP_ALL)
@ApiTags('health')
@ApiHeaders([
  { name: HttpGeneralAsyncContextHeaderNames.TRACE_ID },
  { name: HttpGeneralAsyncContextHeaderNames.SPAN_ID },
])
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly authHealth: AuthHealthIndicatorService,
    private readonly dbHealth: DatabaseHealthIndicator,
    private readonly kafkaServerStatusService: KafkaServerStatusService,
    private readonly rabbitMqServerStatusService: RabbitMqServerStatusService,
    private readonly gracefulShutdownHealth: GracefulShutdownHealthIndicatorService,
    private readonly redisHealth: RedisCacheManagerHealthIndicator,
    @Inject(PrometheusManager) private readonly prometheusManager: PrometheusManager,
    @Inject(AUTH_SERVICE_DI) private readonly authService: IAuthService,
    @Inject(AUTH_CERTIFICATE_SERVICE_DI) private readonly certificateService: ICertificateService,
  ) {}

  @Get('liveness-probe')
  @HealthCheck({ swaggerDocumentation: true })
  async liveness() {
    const checks = [
      // Для liveness сбой миграций не должен ронять probe (перезапуск не лечит), но реальная
      // недоступность БД — должна. migrationFailedStatus='up' оставляет probe зелёным, а `details`
      // отражают реальное состояние миграций.
      () => this.dbHealth.isHealthy({ migrationFailedStatus: 'up' }),
      () => this.gracefulShutdownHealth.isHealthy(),
      () => this.redisHealth.isHealthy(),
    ];

    this.kafkaServerStatusService.getHealthIndicators().forEach((healthIndicator) => {
      checks.push(() => healthIndicator.isHealthy());
    });

    this.rabbitMqServerStatusService.getHealthIndicators().forEach((healthIndicator) => {
      checks.push(() => healthIndicator.isHealthy());
    });

    return this.health.check(checks);
  }

  @Get('readiness-probe')
  @HealthCheck({ swaggerDocumentation: true })
  async readiness() {
    const checks = [
      () => this.authHealth.isReadiness(),
      () => this.gracefulShutdownHealth.isHealthy(),
      // readiness: дефолтный migrationFailedStatus='down' — pod не получит трафик, пока миграции не применены.
      () => this.dbHealth.isHealthy(),
      () => this.redisHealth.isHealthy(),
    ];

    this.kafkaServerStatusService.getHealthIndicators().forEach((healthIndicator) => {
      checks.push(() => healthIndicator.isHealthy());
    });

    this.rabbitMqServerStatusService.getHealthIndicators().forEach((healthIndicator) => {
      checks.push(() => healthIndicator.isHealthy());
    });

    return this.health.check(checks);
  }

  @Get('our-metrics')
  async metrics() {
    return this.prometheusManager.getMetrics();
  }

  @Get('test-jwt-token')
  async testJwtToken() {
    const accessToken: IAccessTokenData = {
      roles: [AccessRoles.USER],
    };

    return {
      accessToken: this.authService.getJwtToken(accessToken),
      certificate: await this.certificateService.getCert(),
    };
  }
}
