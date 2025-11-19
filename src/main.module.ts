import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeneralAsyncContextFormatter } from 'src/modules/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { RedisCacheManagerModule } from 'src/modules/redis-cache-manager';
import { PrometheusModule } from 'src/modules/prometheus';
import { AuthModule } from 'src/modules/auth';
import { GracefulShutdownModule } from 'src/modules/graceful-shutdown';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';
import { HttpServerModule } from 'src/modules/http/http-server';
import { GrpcServerModule } from 'src/modules/grpc/grpc-server';
import { KafkaServerModule } from 'src/modules/kafka/kafka-server';
import { HybridServerModule } from 'src/modules/hybrid/hybrid-server';
import { HealthModule } from 'src/health';
import { AppModule, ErrorFormattersFactory, IgnoreObjectsFactory, ObjectFormattersFactory } from 'src/core/app';
import { HttpApiModule } from 'src/core/api/http';
import { GrpcApiModule } from 'src/core/api/grpc';
import { KafkaApiModule } from 'src/core/api/kafka/kafka-api.module';
import { PostgresModule } from 'src/core/repositories/postgres';
import { ExampleHttpModule } from 'src/examples/integrations/http';
import { ExampleGrpcModule } from 'src/examples/integrations/grpc';
import { ExampleKafkaModule } from 'src/examples/integrations/kafka';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['.env', '.default.env'], isGlobal: true, cache: true }),
    AppModule,
    ElkLoggerModule.forRoot({
      imports: [AppModule],
      providers: [GeneralAsyncContextFormatter, HttpSecurityHeadersFormatter],
      formattersOptions: {
        sortFields: ['timestamp', 'level', 'module', 'message', 'traceId', 'payload'],
        ignoreObjects: {
          inject: [IgnoreObjectsFactory],
          useFactory: (ignoreObjectsService: IgnoreObjectsFactory) => ignoreObjectsService.getCheckObjects(),
        },
        exceptionFormatters: {
          inject: [ErrorFormattersFactory],
          useFactory: (errorFormattersService: ErrorFormattersFactory) => errorFormattersService.getFormatters(),
        },
        objectFormatters: {
          inject: [ObjectFormattersFactory],
          useFactory: (objectFormattersService: ObjectFormattersFactory) => objectFormattersService.getFormatters(),
        },
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
    KafkaServerModule.forRoot(),
    HybridServerModule,
    HealthModule,
    HttpApiModule,
    GrpcApiModule,
    KafkaApiModule,
    PostgresModule,
    ExampleHttpModule,
    ExampleGrpcModule,
    ExampleKafkaModule,
  ],
})
export class MainModule {}
