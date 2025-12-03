import { join } from 'path';
import * as cookieParser from 'cookie-parser';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MAIN_SERVICE_NAME } from 'protos/compiled/demo/service/MainService';
import {
  ELK_NEST_LOGGER_SERVICE_DI,
  NestElkLoggerServiceBuilder,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerConfig,
} from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { BEARER_NAME } from 'src/modules/http/http-common';
import { HttpAuthGuard, HttpHeadersResponse, HttpLogging, HttpPrometheus } from 'src/modules/http/http-server';
import {
  GrpcAuthGuard,
  GrpcLogging,
  GrpcMicroserviceBuilder,
  GrpcPrometheus,
  GrpcServerStatusService,
} from 'src/modules/grpc/grpc-server';
import {
  KafkaServerStatusService,
  KafkaMicroserviceBuilder,
  KAFKA_SERVER_HEADERS_ADAPTER_DI,
} from 'src/modules/kafka/kafka-server';
import { HybridErrorResponseFilter, LoggingValidationPipe } from 'src/modules/hybrid/hybrid-server';
import {
  GLOBAL_ROUTE_PREFIX,
  AppConfig,
  AppKafkaConfig,
  KafkaServers,
  ErrorFormattersFactoryBuilder,
  IgnoreObjectsFactoryBuilder,
  ObjectFormattersFactoryBuilder,
  FormattersFactoryBuilder,
} from 'src/core/app';
import { MainModule } from 'src/main.module';

async function bootstrap(): Promise<void> {
  const initConfigService = new ConfigService();
  let nestLogger = NestElkLoggerServiceBuilder.build({
    configService: initConfigService,
    formattersOptions: {
      sortFields: ['timestamp', 'level', 'module', 'message', 'traceId', 'payload'],
      ignoreObjects: IgnoreObjectsFactoryBuilder.build().getCheckObjects(),
      exceptionFormatters: ErrorFormattersFactoryBuilder.build().getFormatters(),
      objectFormatters: ObjectFormattersFactoryBuilder.build().getFormatters(),
    },
    formatters: (elkLoggerConfig: ElkLoggerConfig) => {
      return FormattersFactoryBuilder.build({ elkLoggerConfig }).getFormatters();
    },
  });

  const app = await NestFactory.create<NestExpressApplication>(MainModule, { logger: nestLogger, bufferLogs: true });

  app.useStaticAssets(join(__dirname, '../front/static'));
  app.setBaseViewsDir(join(__dirname, '../front/views'));
  app.setViewEngine('ejs');

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
    exclude: [
      { path: 'health{*path}', method: RequestMethod.ALL },
      { path: 'chat{*path}', method: RequestMethod.ALL },
    ],
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

  GrpcMicroserviceBuilder.setup(app, {
    url: `http://${appConfig.getGrpcHost()}:${appConfig.getGrpcPort()}`,
    services: [MAIN_SERVICE_NAME],
    package: ['demo.service'],
    baseDir: join(__dirname, '../protos'),
    protoPath: ['/demo/service/MainService.proto'],
    includeDirs: [],
    normalizeUrl: true,
    statusService: app.get(GrpcServerStatusService),
  });

  const appKafkaConfig = app.get(AppKafkaConfig);

  KafkaMicroserviceBuilder.setup(app, {
    kafkaOptions: {
      serverName: KafkaServers.MAIN_KAFKA_BROKER,
      postfixId: '',
      client: {
        brokers: appKafkaConfig.getKafkaBrokers(),
        clientId: appKafkaConfig.getKafkaClientId(),
        useLogger: true,
        connectionTimeout: 2_000,
      },
      consumer: {
        groupId: appKafkaConfig.getKafkaGroupId(),
        retry: appKafkaConfig.getKafkaConsumerRetry(),
      },
      headerAdapter: app.get(KAFKA_SERVER_HEADERS_ADAPTER_DI),
      healthIndicatorOptions: {
        useAdmin: true,
        retry: appKafkaConfig.getKafkaHealthIndicatorRetry(),
      },
      startTimeout: 20_000,
    },
    loggerBuilder: app.get(ELK_LOGGER_SERVICE_BUILDER_DI),
    prometheusManager: app.get(PrometheusManager),
    kafkaStatusService: app.get(KafkaServerStatusService),
  });

  app.enableShutdownHooks();

  await app.init();
  // В начале открываем REST API для доступности Health Checks, логов и метрик.
  await app.listen(appConfig.getServicePort());
  // Запускаем все дополнительные службы - их состояние будет отражено в Health Checks, логах и метриках.
  await app.startAllMicroservices();
}

bootstrap();
