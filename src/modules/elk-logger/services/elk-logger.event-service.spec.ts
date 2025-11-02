import { Test } from '@nestjs/testing';
import { ElkLoggerEventService } from './elk-logger.event-service';
import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { IElkLoggerService, IElkLoggerServiceBuilder, ILogFields, LogLevel } from '../types/elk-logger.types';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { ELK_LOGGER_SERVICE_BUILDER_DI } from '../types/tokens';
import { IElkLoggerEvent } from '../types/decorators.type';

describe(ElkLoggerEventService.name, () => {
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let service: ElkLoggerEventService;

  beforeAll(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService({
            APPLICATION_NAME: 'appName',
            MICROSERVICE_NAME: 'micName',
            MICROSERVICE_VERSION: 'micVer',
          }),
        },
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: {
            build: () => logger,
          },
        },
        ElkLoggerEventService,
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    service = module.get(ElkLoggerEventService);

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(loggerBuilder).toBeDefined();
    expect(service).toBeDefined();
    expect(ElkLoggerEventService['subscription']).toBeDefined();
  });

  it('emit', async () => {
    expect(ElkLoggerEventService['loggerOnMethods']).toBeDefined();
    expect(ElkLoggerEventService['subscription']).toBeDefined();

    const spy = jest.fn();
    const originalMethod = service['handleOnMethod'];

    service['handleOnMethod'] = spy;

    ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, {
      instanceName: 'instanceName',
      methodName: 'methodName',
      loggerPrams: false,
    });

    ElkLoggerEventService.emit(IElkLoggerEvent.BEFORE_CALL, {
      instanceName: 'instanceName',
      methodName: 'methodName',
      loggerPrams: {
        message: 'Test message',
      },
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith({
      event: IElkLoggerEvent.AFTER_CALL,
      instanceName: 'instanceName',
      methodName: 'methodName',
      loggerPrams: false,
    });
    expect(spy).toHaveBeenCalledWith({
      event: IElkLoggerEvent.BEFORE_CALL,
      instanceName: 'instanceName',
      methodName: 'methodName',
      loggerPrams: {
        message: 'Test message',
      },
    });

    service['handleOnMethod'] = originalMethod;
  });

  describe('handleOnMethod', () => {
    let spyLoggerBuilder;
    let spyLogger;
    let fields: ILogFields;

    beforeEach(async () => {
      spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
      spyLogger = jest.spyOn(logger, 'log');

      fields = {
        index: 'TestApplications',
        markers: ['request'],
        module: 'TestService.run',
        businessData: {
          subModule: 'SubModule',
        },
      } as ILogFields;

      jest.clearAllMocks();
    });

    it('skip', async () => {
      expect(ElkLoggerEventService['loggerOnMethods']).toBeDefined();
      expect(ElkLoggerEventService['subscription']).toBeDefined();

      ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: false,
      });

      expect(spyLoggerBuilder).toHaveBeenCalledTimes(0);
      expect(spyLogger).toHaveBeenCalledTimes(0);
    });

    it('call logger builder', async () => {
      expect(ElkLoggerEventService['loggerOnMethods']).toBeDefined();
      expect(ElkLoggerEventService['subscription']).toBeDefined();

      ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: { fields },
      });

      ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: {},
      });

      expect(spyLoggerBuilder).toHaveBeenCalledTimes(2);
      expect(spyLoggerBuilder).toHaveBeenCalledWith({
        module: 'instanceName.methodName',
      });
      expect(spyLoggerBuilder).toHaveBeenCalledWith(fields);
    });

    it('call logger as default', async () => {
      expect(ElkLoggerEventService['loggerOnMethods']).toBeDefined();
      expect(ElkLoggerEventService['subscription']).toBeDefined();

      ElkLoggerEventService.emit(IElkLoggerEvent.BEFORE_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: {
          data: {
            payload: {
              details: 'start process',
            },
          },
        },
      });

      ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: {
          data: {
            payload: {
              status: 'ok',
            },
          },
        },
      });

      ElkLoggerEventService.emit(IElkLoggerEvent.THROW_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: {
          data: {
            payload: {
              status: 'error',
            },
          },
        },
      });

      expect(spyLogger).toHaveBeenCalledTimes(3);
      expect(spyLogger).toHaveBeenCalledWith(LogLevel.INFO, 'instanceName.methodName called', {
        payload: {
          details: 'start process',
        },
      });
      expect(spyLogger).toHaveBeenCalledWith(LogLevel.INFO, 'instanceName.methodName success', {
        payload: {
          status: 'ok',
        },
      });
      expect(spyLogger).toHaveBeenCalledWith(LogLevel.ERROR, 'instanceName.methodName filed', {
        payload: {
          status: 'error',
        },
      });
    });

    it('call logger as custom', async () => {
      expect(ElkLoggerEventService['loggerOnMethods']).toBeDefined();
      expect(ElkLoggerEventService['subscription']).toBeDefined();

      ElkLoggerEventService.emit(IElkLoggerEvent.BEFORE_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: {
          message: 'start process',
          data: {
            payload: {
              details: 'start process',
            },
          },
        },
      });

      ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: {
          message: 'success process',
          data: {
            payload: {
              status: 'ok',
            },
          },
        },
      });

      ElkLoggerEventService.emit(IElkLoggerEvent.THROW_CALL, {
        instanceName: 'instanceName',
        methodName: 'methodName',
        loggerPrams: {
          message: 'filed process',
          data: {
            payload: {
              status: 'error',
            },
          },
        },
      });

      expect(spyLogger).toHaveBeenCalledTimes(3);
      expect(spyLogger).toHaveBeenCalledWith(LogLevel.INFO, 'start process', {
        payload: {
          details: 'start process',
        },
      });
      expect(spyLogger).toHaveBeenCalledWith(LogLevel.INFO, 'success process', {
        payload: {
          status: 'ok',
        },
      });
      expect(spyLogger).toHaveBeenCalledWith(LogLevel.ERROR, 'filed process', {
        payload: {
          status: 'error',
        },
      });
    });
  });

  it('onApplicationShutdown', async () => {
    expect(ElkLoggerEventService['loggerOnMethods']).toBeDefined();
    expect(ElkLoggerEventService['subscription']).toBeDefined();

    const spy = jest.fn();

    const originalMethod = service['handleOnMethod'];
    service['handleOnMethod'] = spy;

    service.onApplicationShutdown();
    expect(ElkLoggerEventService['subscription']).toBeUndefined();

    ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, {
      instanceName: 'instanceName',
      methodName: 'methodName',
      loggerPrams: {},
    });

    expect(spy).toHaveBeenCalledTimes(0);

    service['handleOnMethod'] = originalMethod;
  });
});
