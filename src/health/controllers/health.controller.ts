import { Sequelize } from 'sequelize-typescript';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiHeaders, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, SequelizeHealthIndicator } from '@nestjs/terminus';
import {
  AUTH_SERVICE_DI,
  IAccessTokenData,
  AccessRoles,
  IAuthService,
  AUTH_CERTIFICATE_SERVICE_DI,
  ICertificateService,
  AuthHealthIndicatorService,
} from 'src/modules/auth';
import { SkipInterceptors } from 'src/modules/common';
import { PrometheusManager } from 'src/modules/prometheus';
import { GracefulShutdownHealthIndicatorService } from 'src/modules/graceful-shutdown';
import { DATABASE_DI } from 'src/modules/database';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';

@SkipInterceptors({
  All: true,
})
@ApiTags('health')
@ApiHeaders([
  { name: HttpGeneralAsyncContextHeaderNames.TRACE_ID },
  { name: HttpGeneralAsyncContextHeaderNames.SPAN_ID },
])
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly sequelizeHealth: SequelizeHealthIndicator,
    private readonly authHealth: AuthHealthIndicatorService,
    @Inject(DATABASE_DI) private readonly db: Sequelize,
    private readonly gracefulShutdownHealth: GracefulShutdownHealthIndicatorService,
    @Inject(PrometheusManager) private readonly prometheusManager: PrometheusManager,
    @Inject(AUTH_SERVICE_DI) private readonly authService: IAuthService,
    @Inject(AUTH_CERTIFICATE_SERVICE_DI) private readonly certificateService: ICertificateService,
  ) {}

  @Get('liveness-probe')
  @HealthCheck({ swaggerDocumentation: true })
  async liveness() {
    return this.health.check([
      () =>
        this.sequelizeHealth.pingCheck('DataBase', {
          connection: this.db,
          timeout: 10_000,
        }),
    ]);
  }

  @Get('readiness-probe')
  @HealthCheck({ swaggerDocumentation: true })
  async readiness() {
    return this.health.check([() => this.authHealth.isReadiness(), () => this.gracefulShutdownHealth.isReadiness()]);
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
