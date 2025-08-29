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
import { PrometheusManager } from 'src/modules/prometheus';
import {
  AUTH_CERTIFICATE_SERVICE_DI,
  AUTH_SERVICE_DI,
  AuthHealthIndicatorService,
  IAuthService,
  ICertificateService,
} from 'src/modules/auth';
import { DATABASE_DI } from 'src/modules/database';
import { GracefulShutdownHealthIndicatorService } from 'src/modules/graceful-shutdown';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { HealthController } from './health.controller';

class MockSequelize {
  async authenticate(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(): Promise<any> {}
}
const mSequelize = new MockSequelize();

jest.mock('sequelize-typescript', () => {
  return { Sequelize: jest.fn(() => mSequelize) };
});

describe(HealthController.name, () => {
  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let authService: IAuthService;
  let certificateService: ICertificateService;
  let prometheusManager: PrometheusManager;
  let controller: HealthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), TerminusModule],
      providers: [
        {
          provide: DATABASE_DI,
          useValue: mSequelize,
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
          provide: PrometheusManager,
          useValue: {
            getMetrics: jest.fn(),
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
            isReadiness: async () => ({
              GracefulShutdown: {
                status: 'up',
                isActive: false,
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
      .compile();

    module.useLogger(nestLogger);

    authService = module.get(AUTH_SERVICE_DI);
    certificateService = module.get(AUTH_CERTIFICATE_SERVICE_DI);
    prometheusManager = module.get(PrometheusManager);
    controller = module.get(HealthController);
  });

  it('init', async () => {
    expect(authService).toBeDefined();
    expect(certificateService).toBeDefined();
    expect(prometheusManager).toBeDefined();
    expect(controller).toBeDefined();
  });

  it('liveness', async () => {
    jest.spyOn(mSequelize, 'query').mockImplementation(async () => [1]);

    const result = await controller.liveness();

    expect(result).toEqual({
      status: 'ok',
      info: {
        DataBase: {
          status: 'up',
        },
      },
      error: {},
      details: {
        DataBase: {
          status: 'up',
        },
      },
    });
  });

  it('readiness', async () => {
    const result = await controller.readiness();

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
