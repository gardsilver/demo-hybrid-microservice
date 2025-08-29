import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { AUTH_CERTIFICATE_SERVICE_DI, AUTH_SERVICE_DI } from './types/tokens';
import { MockCertificateService } from './services/mock.certificate.service';
import { AuthService } from './services/auth.service';
import { AuthModuleOptions } from './types/types';
import { AuthHealthIndicatorService } from './services/auth.health-indicator.service';
import { TerminusModule } from '@nestjs/terminus';

@Module({})
export class AuthModule {
  static forRoot(options?: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [ConfigModule, ElkLoggerModule, TerminusModule],
      providers: [
        {
          provide: AUTH_CERTIFICATE_SERVICE_DI,
          useValue: new MockCertificateService(options),
        },
        {
          provide: AUTH_SERVICE_DI,
          useClass: AuthService,
        },
        AuthHealthIndicatorService,
      ],
      exports: [AUTH_SERVICE_DI, AUTH_CERTIFICATE_SERVICE_DI, AuthHealthIndicatorService],
    };
  }
}
