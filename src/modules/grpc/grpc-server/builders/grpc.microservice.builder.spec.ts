/* eslint-disable @typescript-eslint/no-explicit-any */
import { HealthImplementation } from 'grpc-health-check';
import { ReflectionService } from '@grpc/reflection';
import { NestExpressApplication } from '@nestjs/platform-express';
import { UrlHelper } from 'src/modules/common';
import { GrpcProtoPathHelper } from 'src/modules/grpc/grpc-common';
import { IGrpcMicroserviceBuilderOptions } from '../types/types';
import { GrpcMicroserviceBuilder } from './grpc.microservice.builder';
import { GrpcServerStatusService } from '../services/grpc-server.status.service';
import { GrpcServerStrategy } from '../services/grpc-server.strategy';

jest.mock('src/modules/elk-logger', () => {
  return {
    __esModule: true,
    TraceSpanHelper: {
      generateTraceId: jest.fn().mockReturnValue('generated_trace_id_32_chars_long'),
      generateSpanId: jest.fn().mockReturnValue('generated_span_id'),
    },
  };
});

describe(GrpcMicroserviceBuilder.name, () => {
  let spyUrlHelper: jest.SpyInstance;
  let spyExistPaths: jest.SpyInstance;
  let spyExistJoinBase: jest.SpyInstance;
  let statusService: GrpcServerStatusService;

  const app = {
    connectMicroservice: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    spyUrlHelper = jest.spyOn(UrlHelper, 'normalize');
    spyExistPaths = jest.spyOn(GrpcProtoPathHelper, 'existPaths').mockImplementation(() => {});
    spyExistJoinBase = jest.spyOn(GrpcProtoPathHelper, 'joinBase').mockImplementation(() => {
      return ['proto/testDir'];
    });
    statusService = {
      addGrpcHealthImplementation: jest.fn(),
    } as unknown as GrpcServerStatusService;
  });

  it('Должен успешно подключить Микросервис через кастомную стратегию', async () => {
    const spyStatusService = jest.spyOn(statusService, 'addGrpcHealthImplementation');
    
    GrpcMicroserviceBuilder.setup(
      app as unknown as NestExpressApplication,
      {
        url: 'test:1111',
        statusService,
      } as IGrpcMicroserviceBuilderOptions,
    );

    expect(app.connectMicroservice).toHaveBeenCalled();

    const configPassedToNest = app.connectMicroservice.mock.calls[0][0];

    expect(configPassedToNest.strategy).toBeDefined();
    expect(configPassedToNest.strategy).toBeInstanceOf(GrpcServerStrategy);
    expect(spyStatusService).toHaveBeenCalledTimes(1);
  });

  it('Должен проверить существование всех proto-файлов по путям', async () => {
    GrpcMicroserviceBuilder.setup(
      app as unknown as NestExpressApplication,
      {
        url: 'test:1111',
        baseDir: 'protos',
        protoPath: ['/file.proto'],
        includeDirs: ['protos/test'],
        statusService,
      } as IGrpcMicroserviceBuilderOptions,
    );

    expect(spyExistJoinBase).toHaveBeenCalledWith('protos', ['/file.proto']);
    expect(spyExistPaths).toHaveBeenCalledWith(['proto/testDir']);
    expect(spyExistPaths).toHaveBeenCalledWith(['protos/test']);
  });

  it('Должен скорректировать url и выбросить ошибку при некорректном url', async () => {
    expect(() => {
      GrpcMicroserviceBuilder.setup(
        app as unknown as NestExpressApplication,
        {
          url: 'test.ru',
          normalizeUrl: true,
          statusService,
        } as IGrpcMicroserviceBuilderOptions,
      );
    }).toThrow(new Error('Не корректный формат url (test.ru)'));

    expect(spyUrlHelper).toHaveBeenCalledTimes(1);
  });

  it('Должен зарегистрировать хуки ReflectionService и HealthImplementation на этапе загрузки пакетов', async () => {
    const spyRefSetStatus = jest.spyOn(ReflectionService.prototype, 'addToServer').mockImplementation(() => ({} as any));
    const spyHelAddToServer = jest.spyOn(HealthImplementation.prototype, 'addToServer').mockImplementation(() => {});
    const spySetStatus = jest.spyOn(HealthImplementation.prototype, 'setStatus').mockImplementation(() => {});

    GrpcMicroserviceBuilder.setup(
      app as unknown as NestExpressApplication,
      {
        url: 'test:1111',
        baseDir: 'protos',
        protoPath: ['/file.proto'],
        includeDirs: ['protos/test'],
        statusService,
      } as IGrpcMicroserviceBuilderOptions,
    );

    const configPassedToNest = app.connectMicroservice.mock.calls[0][0];
    const strategyInstance = configPassedToNest.strategy as GrpcServerStrategy;

    const internalGrpcOptions = (strategyInstance as any).options;
    const onLoadPackageDefinition = internalGrpcOptions?.onLoadPackageDefinition;

    if (onLoadPackageDefinition === undefined) {
      throw new Error('onLoadPackageDefinition is not defined on internal options');
    }

    const mockServer = {
      addService: jest.fn(),
    };

    onLoadPackageDefinition([], mockServer);

    expect(spyRefSetStatus).toHaveBeenCalledTimes(1);
    expect(spyHelAddToServer).toHaveBeenCalledTimes(1);
    expect(spySetStatus).toHaveBeenCalledTimes(1);
    expect(spySetStatus).toHaveBeenCalledWith('', 'SERVING');
  });
});
