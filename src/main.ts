import { join } from 'path';
import * as cookieParser from 'cookie-parser';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MAIN_SERVICE_NAME } from 'protos/compiled/demo/service/MainService';
import { GeneralAsyncContextFormatter } from 'src/modules/common';
import {
  ELK_NEST_LOGGER_SERVICE_DI,
  NestElkLoggerServiceBuilder,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerConfig,
} from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { RedisClientErrorFormatter } from 'src/modules/redis-cache-manager';
import { DataBaseErrorFormatter, ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { HttpSecurityHeadersFormatter, BEARER_NAME } from 'src/modules/http/http-common';
import { AxiosErrorFormatter, HttpClientErrorFormatter } from 'src/modules/http/http-client';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { GrpcServiceErrorFormatter, GrpcClientErrorFormatter } from 'src/modules/grpc/grpc-client';
import {
  HttpAuthGuard,
  HttpExceptionFormatter,
  HttpHeadersResponse,
  HttpLogging,
  HttpPrometheus,
} from 'src/modules/http/http-server';
import {
  GrpcAuthGuard,
  GrpcLogging,
  GrpcMicroserviceBuilder,
  GrpcPrometheus,
  RpcExceptionFormatter,
} from 'src/modules/grpc/grpc-server';
import { KafkaJsErrorObjectFormatter } from 'src/modules/kafka/kafka-common';
import { KafkaServerStatusService, KafkaMicroserviceBuilder } from 'src/modules/kafka/kafka-server';
import { HybridErrorResponseFilter, LoggingValidationPipe } from 'src/modules/hybrid/hybrid-server';
import { GLOBAL_ROUTE_PREFIX, AppConfig, KafkaServers } from 'src/core/app';
import { HealthStatusService } from 'src/health';
import { MainModule } from 'src/main.module';

async function bootstrap(): Promise<void> {
  const initConfigService = new ConfigService();
  let nestLogger = NestElkLoggerServiceBuilder.build({
    configService: initConfigService,
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
        new KafkaJsErrorObjectFormatter(),
      ],
      objectFormatters: [new MetadataObjectFormatter(), new ValidationErrorItemObjectFormatter()],
    },
    formatters: [
      new GeneralAsyncContextFormatter(),
      new HttpSecurityHeadersFormatter(new ElkLoggerConfig(initConfigService, [], [])),
    ],
  });

  const app = await NestFactory.create<NestExpressApplication>(MainModule, { logger: nestLogger, bufferLogs: true });

  nestLogger = app.get(ELK_NEST_LOGGER_SERVICE_DI);
  app.useLogger(nestLogger);
  app.flushLogs();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
    new LoggingValidationPipe(app.get(ELK_LOGGER_SERVICE_BUILDER_DI)),
  );

  app.useGlobalFilters(app.get(HybridErrorResponseFilter));

  app.useGlobalGuards(app.get(HttpAuthGuard), app.get(GrpcAuthGuard));
  app.useGlobalInterceptors(
    app.get(HttpLogging),
    app.get(HttpPrometheus),
    app.get(HttpHeadersResponse),
    app.get(GrpcLogging),
    app.get(GrpcPrometheus),
  );

  const appConfig = app.get(AppConfig);

  app.enableCors(appConfig.getCorsOptions());
  app.use(cookieParser());
  app.setGlobalPrefix(GLOBAL_ROUTE_PREFIX, {
    exclude: [{ path: 'health{*path}', method: RequestMethod.ALL }],
  });

  const document = new DocumentBuilder()
    .setTitle('Demo Hybrid Microservice')
    .setDescription('REST API/ gRPC API')
    .addBearerAuth({
      type: 'http',
      scheme: BEARER_NAME.toLocaleLowerCase(),
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Введите JWT токен',
      in: 'header',
    })
    .build();
  const documentation = SwaggerModule.createDocument(app, document);
  const customOption: SwaggerCustomOptions = {
    swaggerOptions: {
      withCredentials: true,
    },
  };

  SwaggerModule.setup('/', app, documentation, customOption);

  const { grpcServices, grpcHealthImpl } = GrpcMicroserviceBuilder.setup(app, {
    url: `http://${appConfig.getGrpcHost()}:${appConfig.getGrpcPort()}`,
    services: [MAIN_SERVICE_NAME],
    package: ['demo.service'],
    baseDir: join(__dirname, '../protos'),
    protoPath: ['/demo/service/MainService.proto'],
    includeDirs: [],
    normalizeUrl: true,
  });

  app.get(HealthStatusService).addGrpcHealthImplementation(grpcHealthImpl, grpcServices);

  KafkaMicroserviceBuilder.setup(app, {
    kafkaOptions: {
      serverName: KafkaServers.MAIN_KAFKA_BROKER,
      postfixId: '',
      client: {
        brokers: appConfig.getKafkaBrokers(),
        clientId: appConfig.getKafkaClientId(),
        connectionTimeout: 500,
        authenticationTimeout: 500,
        retry: {
          timeout: 30_000,
          delay: 1_000,
          retryMaxCount: 20,
        },
        useLogger: true,
      },
      consumer: {
        groupId: appConfig.getKafkaGroupId(),
        retry: {
          timeout: 30_000,
          delay: 1_000,
          retryMaxCount: 20,
          statusCodes: appConfig.getKafkaRetryStatusCodes(),
        },
      },
    },
    loggerBuilder: app.get(ELK_LOGGER_SERVICE_BUILDER_DI),
    prometheusManager: app.get(PrometheusManager),
    kafkaStatusService: app.get(KafkaServerStatusService),
  });

  app.enableShutdownHooks();

  await app.init();
  await app.startAllMicroservices();
  await app.listen(appConfig.getServicePort());
}

bootstrap();
