import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeneralAsyncContextFormatter } from 'src/modules/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { RedisCacheManagerModule, RedisClientErrorFormatter } from 'src/modules/redis-cache-manager';
import { PrometheusModule } from 'src/modules/prometheus';
import { AuthModule } from 'src/modules/auth';
import { GracefulShutdownModule } from 'src/modules/graceful-shutdown';
import { DataBaseErrorFormatter, ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';
import { AxiosErrorFormatter, HttpClientErrorFormatter } from 'src/modules/http/http-client';
import { HttpExceptionFormatter, HttpServerModule } from 'src/modules/http/http-server';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { GrpcClientErrorFormatter, GrpcServiceErrorFormatter } from 'src/modules/grpc/grpc-client';
import { GrpcServerModule, RpcExceptionFormatter } from 'src/modules/grpc/grpc-server';
import { HybridServerModule } from 'src/modules/hybrid/hybrid-server';
import { HealthModule } from 'src/health';
import { AppModule } from 'src/core/app';
import { HttpApiModule } from 'src/core/api/http';
import { GrpcApiModule } from 'src/core/api/grpc';
import { PostgresModule } from 'src/core/repositories/postgres';
import { ExampleHttpModule } from 'src/examples/integrations/http';
import { ExampleGrpcModule } from 'src/examples/integrations/grpc';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['.env', '.default.env'], isGlobal: true, cache: true }),
    AppModule,
    ElkLoggerModule.forRoot({
      providers: [GeneralAsyncContextFormatter, HttpSecurityHeadersFormatter],
      formattersOptions: {
        sortFields: ['timestamp', 'level', 'module', 'message', 'traceId', 'payload'],
        exceptionFormatters: [
          new DataBaseErrorFormatter(),
          new AxiosErrorFormatter(),
          new HttpClientErrorFormatter(),
          new HttpExceptionFormatter(),
          new GrpcServiceErrorFormatter(),
          new GrpcClientErrorFormatter(),
          new RpcExceptionFormatter(),
          new RedisClientErrorFormatter(),
        ],
        objectFormatters: [new MetadataObjectFormatter(), new ValidationErrorItemObjectFormatter()],
      },
      formatters: {
        inject: [GeneralAsyncContextFormatter, HttpSecurityHeadersFormatter],
        useFactory: (
          asyncContextFormatter: GeneralAsyncContextFormatter,
          securityHeadersFormatter: HttpSecurityHeadersFormatter,
        ) => {
          return [asyncContextFormatter, securityHeadersFormatter];
        },
      },
    }),
    PrometheusModule,
    RedisCacheManagerModule.forRoot({
      imports: [PostgresModule],
    }),
    AuthModule.forRoot({
      useCertificate: '801c29c6-ed2f-4ae4-92fb-fafe914893c0',
    }),
    HttpServerModule.forRoot(),
    GracefulShutdownModule.forRoot(),
    GrpcServerModule.forRoot(),
    HybridServerModule,
    HealthModule,
    HttpApiModule,
    GrpcApiModule,
    PostgresModule,
    ExampleHttpModule,
    ExampleGrpcModule,
  ],
})
export class MainModule {}
