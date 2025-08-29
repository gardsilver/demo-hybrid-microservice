import { HealthImplementation } from 'grpc-health-check';
import { ReflectionService } from '@grpc/reflection';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { UrlHelper } from 'src/modules/common';
import { GrpcProtoPathHelper } from 'src/modules/grpc/grpc-common';
import { IGrpcMicroserviceBuilderOptions } from '../types/types';
import { GrpcMicroserviceBuilder } from './grpc.microservice.builder';

describe(GrpcMicroserviceBuilder.name, () => {
  let spyUrlHelper;
  let spyExistPaths;
  let spyExistJoinBase;

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
  });

  it('Должен подключить Микросервис', async () => {
    GrpcMicroserviceBuilder.setup(
      app as unknown as NestExpressApplication,
      {
        url: 'test:1111',
      } as IGrpcMicroserviceBuilderOptions,
    );
    expect(app.connectMicroservice).toHaveBeenCalled();

    const params = app.connectMicroservice.mock.calls[0][0];

    expect(params.transport).toBe(Transport.GRPC);
    expect(params.options.url).toBe('test:1111');
  });

  it('Должен проверить все proto-файлы', async () => {
    GrpcMicroserviceBuilder.setup(
      app as unknown as NestExpressApplication,
      {
        url: 'test:1111',
        baseDir: 'protos',
        protoPath: ['/file.proto'],
        includeDirs: ['protos/test'],
      } as IGrpcMicroserviceBuilderOptions,
    );

    expect(spyExistJoinBase).toHaveBeenCalledWith('protos', ['/file.proto']);
    expect(spyExistPaths).toHaveBeenCalledWith(['proto/testDir']);
    expect(spyExistPaths).toHaveBeenCalledWith(['protos/test']);
  });

  it('Должен скорректировать url и выбросить ошибку при не корректном url', async () => {
    expect(() => {
      GrpcMicroserviceBuilder.setup(
        app as unknown as NestExpressApplication,
        {
          url: 'test.ru',
          normalizeUrl: true,
        } as IGrpcMicroserviceBuilderOptions,
      );
    }).toThrow(new Error('Не корректный формат url (test.ru)'));

    expect(spyUrlHelper).toHaveBeenCalledTimes(1);
  });

  it('Должен подключить ReflectionService и HealthImplementation', async () => {
    const spyRefSetStatus = jest.spyOn(ReflectionService.prototype, 'addToServer');
    const spyHelAddToServer = jest.spyOn(HealthImplementation.prototype, 'addToServer');
    const spySetStatus = jest.spyOn(HealthImplementation.prototype, 'setStatus');

    GrpcMicroserviceBuilder.setup(
      app as unknown as NestExpressApplication,
      {
        url: 'test:1111',
        baseDir: 'protos',
        protoPath: ['/file.proto'],
        includeDirs: ['protos/test'],
      } as IGrpcMicroserviceBuilderOptions,
    );

    const onLoadPackageDefinition = (app.connectMicroservice.mock.calls[0][0] as GrpcOptions).options
      .onLoadPackageDefinition;

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
