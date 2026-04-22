import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ELK_LOGGER_SERVICE_DI,
  ELK_NEST_LOGGER_SERVICE_DI,
  ElkLoggerModule,
  IElkLoggerService,
  INestElkLoggerService,
} from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import {
  AUTH_CERTIFICATE_SERVICE_DI,
  AUTH_SERVICE_DI,
  AuthHealthIndicatorService,
  IAuthService,
  ICertificateService,
} from 'src/modules/auth';
import { DatabaseHealthIndicator } from 'src/modules/database';
import { GracefulShutdownHealthIndicatorService } from 'src/modules/graceful-shutdown';
import { RedisCacheManagerHealthIndicator } from 'src/modules/redis-cache-manager';
import {
  KafkaServerHealthIndicator,
  KafkaServerModule,
  KafkaServerStatusService,
} from 'src/modules/kafka/kafka-server';
import {
  RabbitMqHealthIndicator,
  RabbitMqServerModule,
  RabbitMqServerStatusService,
} from 'src/modules/rabbit-mq/rabbit-mq-server';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { HealthController } from './health.controller';

describe(HealthController.name, () => {
  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let authService: IAuthService;
  let certificateService: ICertificateService;
  let kafkaServerStatusService: KafkaServerStatusService;
  let rabbitMqServerStatusService: RabbitMqServerStatusService;
  let prometheusManager: PrometheusManager;
  let controller: HealthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule,
        ElkLoggerModule.forRoot(),
        TerminusModule,
        PrometheusModule,
        KafkaServerModule.forRoot(),
        RabbitMqServerModule.forRoot(),
      ],
      providers: [
        {
          provide: DatabaseHealthIndicator,
          useValue: {
            isHealthy: jest.fn(async () => ({
              DataBase: {
                status: 'up',
                ping: 'ok',
                migration: 'ok',
              },
            })),
          },
        },
        {
          provide: AUTH_SERVICE_DI,
          useValue: {
            getJwtToken: jest.fn(),
          },
        },
        {
          provide: AUTH_CERTIFICATE_SERVICE_DI,
          useValue: {
            getCert: jest.fn(),
          },
        },
        {
          provide: AuthHealthIndicatorService,
          useValue: {
            isReadiness: async () => ({
              Certificate: {
                status: 'up',
                synchronized: true,
              },
            }),
          },
        },
        {
          provide: GracefulShutdownHealthIndicatorService,
          useValue: {
            isHealthy: async () => ({
              GracefulShutdown: {
                status: 'up',
                isActive: false,
              },
            }),
          },
        },
        {
          provide: RedisCacheManagerHealthIndicator,
          useValue: {
            isHealthy: async () => ({
              Redis: {
                status: 'up',
                isOpen: true,
                isReady: true,
                ping: 'PONG',
              },
            }),
          },
        },
      ],
      controllers: [HealthController],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .overrideProvider(ELK_LOGGER_SERVICE_DI)
      .useValue(logger)
      .overrideProvider(ELK_NEST_LOGGER_SERVICE_DI)
      .useValue(nestLogger)
      .overrideProvider(PrometheusManager)
      .useValue({
        getMetrics: jest.fn(),
      })
      .compile();

    module.useLogger(nestLogger);

    authService = module.get(AUTH_SERVICE_DI);
    certificateService = module.get(AUTH_CERTIFICATE_SERVICE_DI);
    kafkaServerStatusService = module.get(KafkaServerStatusService);
    rabbitMqServerStatusService = module.get(RabbitMqServerStatusService);
    prometheusManager = module.get(PrometheusManager);
    controller = module.get(HealthController);

    kafkaServerStatusService.getHealthIndicators = () => {
      return [
        {
          isHealthy: async () => ({
            Kafka: {
              status: 'up',
            },
          }),
        } as unknown as KafkaServerHealthIndicator,
      ];
    };

    rabbitMqServerStatusService.getHealthIndicators = () => {
      return [
        {
          isHealthy: async () => ({
            RabbitMq: {
              status: 'up',
            },
          }),
        } as unknown as RabbitMqHealthIndicator,
      ];
    };
  });

  it('init', async () => {
    expect(authService).toBeDefined();
    expect(certificateService).toBeDefined();
    expect(kafkaServerStatusService).toBeDefined();
    expect(rabbitMqServerStatusService).toBeDefined();
    expect(prometheusManager).toBeDefined();
    expect(controller).toBeDefined();
  });

  it('liveness', async () => {
    const dbHealth = controller['dbHealth'] as unknown as { isHealthy: jest.Mock };
    const spyDbHealth = jest.spyOn(dbHealth, 'isHealthy');

    const result = await controller.liveness();

    // Liveness передаёт migrationFailedStatus='up', чтобы падение миграций не рестартило pod.
    expect(spyDbHealth).toHaveBeenCalledWith({ migrationFailedStatus: 'up' });
    expect(result).toEqual({
      status: 'ok',
      info: {
        DataBase: {
          status: 'up',
          ping: 'ok',
          migration: 'ok',
        },
        GracefulShutdown: {
          status: 'up',
          isActive: false,
        },
        Redis: {
          status: 'up',
          isOpen: true,
          isReady: true,
          ping: 'PONG',
        },
        Kafka: {
          status: 'up',
        },
        RabbitMq: {
          status: 'up',
        },
      },
      error: {},
      details: {
        DataBase: {
          status: 'up',
          ping: 'ok',
          migration: 'ok',
        },
        GracefulShutdown: {
          status: 'up',
          isActive: false,
        },
        Redis: {
          status: 'up',
          isOpen: true,
          isReady: true,
          ping: 'PONG',
        },
        Kafka: {
          status: 'up',
        },
        RabbitMq: {
          status: 'up',
        },
      },
    });
  });

  it('readiness', async () => {
    const dbHealth = controller['dbHealth'] as unknown as { isHealthy: jest.Mock };
    const spyDbHealth = jest.spyOn(dbHealth, 'isHealthy');

    const result = await controller.readiness();

    // Readiness использует дефолт (migrationFailedStatus='down'): без опций.
    expect(spyDbHealth).toHaveBeenCalledWith();
    expect(result).toEqual({
      status: 'ok',
      info: {
        Certificate: {
          status: 'up',
          synchronized: true,
        },
        GracefulShutdown: {
          status: 'up',
          isActive: false,
        },
        DataBase: {
          status: 'up',
          ping: 'ok',
          migration: 'ok',
        },
        Redis: {
          status: 'up',
          isOpen: true,
          isReady: true,
          ping: 'PONG',
        },
        Kafka: {
          status: 'up',
        },
        RabbitMq: {
          status: 'up',
        },
      },
      error: {},
      details: {
        Certificate: {
          status: 'up',
          synchronized: true,
        },
        GracefulShutdown: {
          status: 'up',
          isActive: false,
        },
        DataBase: {
          status: 'up',
          ping: 'ok',
          migration: 'ok',
        },
        Redis: {
          status: 'up',
          isOpen: true,
          isReady: true,
          ping: 'PONG',
        },
        Kafka: {
          status: 'up',
        },
        RabbitMq: {
          status: 'up',
        },
      },
    });
  });

  it('metrics', async () => {
    jest.spyOn(prometheusManager, 'getMetrics').mockImplementation(async () => 'success');

    const result = await controller.metrics();

    expect(result).toBe('success');
  });

  it('testJwtToken', async () => {
    const spy = jest.spyOn(authService, 'getJwtToken').mockImplementation(() => 'token');
    jest.spyOn(certificateService, 'getCert').mockImplementation(async () => 'certificate');

    const result = await controller.testJwtToken();

    expect(result).toEqual({
      accessToken: 'token',
      certificate: 'certificate',
    });

    expect(spy).toHaveBeenCalledWith({
      roles: ['user'],
    });
  });
});
