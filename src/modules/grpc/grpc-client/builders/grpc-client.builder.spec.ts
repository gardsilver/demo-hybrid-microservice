import { ClientGrpcProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { UrlHelper } from 'src/modules/common';
import { GrpcProtoPathHelper } from 'src/modules/grpc/grpc-common';
import { GrpcClientBuilder } from './grpc-client.builder';
import { IGrpcClientProxyBuilderOptions } from '../types/types';

describe(GrpcClientBuilder.name, () => {
  let spyUrlHelper;
  let spyExistPaths;
  let spyExistJoinBase;

  beforeEach(async () => {
    spyUrlHelper = jest.spyOn(UrlHelper, 'normalize');
    spyExistPaths = jest.spyOn(GrpcProtoPathHelper, 'existPaths').mockImplementation(() => {});
    spyExistJoinBase = jest.spyOn(GrpcProtoPathHelper, 'joinBase').mockImplementation(() => {
      return ['proto/testDir'];
    });
  });

  it('Должен проверить все proto-файлы и создать ClientGrpcProxy', async () => {
    const spy = jest.spyOn(ClientProxyFactory, 'create').mockImplementation(jest.fn());

    GrpcClientBuilder.buildClientGrpcProxy({
      url: 'test:1111',
      baseDir: 'protos',
      protoPath: ['/file.proto'],
      includeDirs: ['protos/test'],
    } as IGrpcClientProxyBuilderOptions);

    expect(spy).toHaveBeenCalledWith({
      transport: Transport.GRPC,
      options: {
        url: 'test:1111',
        protoPath: ['proto/testDir'],
        loader: {
          includeDirs: ['protos/test', 'protos'],
        },
      },
    });
    expect(spyExistJoinBase).toHaveBeenCalledWith('protos', ['/file.proto']);
    expect(spyExistPaths).toHaveBeenCalledWith(['proto/testDir']);
    expect(spyExistPaths).toHaveBeenCalledWith(['protos/test']);
  });

  it('Должен скорректировать url и выбросить ошибку при не корректном url', async () => {
    jest.spyOn(ClientProxyFactory, 'create').mockImplementation(jest.fn());

    expect(() => {
      GrpcClientBuilder.buildClientGrpcProxy({
        url: 'test.ru',
        normalizeUrl: true,
      } as IGrpcClientProxyBuilderOptions);
    }).toThrow(new Error('Не корректный формат url (test.ru)'));

    expect(spyUrlHelper).toHaveBeenCalledTimes(1);
  });

  it('buildClientGrpc', async () => {
    const mockClientGrpcProxy = {
      getService: jest.fn(),
    } as undefined as ClientGrpcProxy;

    const spy = jest.spyOn(mockClientGrpcProxy, 'getService');

    GrpcClientBuilder.buildClientGrpc('service', mockClientGrpcProxy);

    expect(spy).toHaveBeenCalledWith('service');
  });
});
