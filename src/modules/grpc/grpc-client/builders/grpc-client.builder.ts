import { ClientProxyFactory, GrpcOptions, ClientGrpcProxy, Transport } from '@nestjs/microservices';
import { UrlHelper } from 'src/modules/common';
import { GrpcProtoPathHelper } from 'src/modules/grpc/grpc-common';
import { IGrpcClientProxyBuilderOptions } from '../types/types';

export class GrpcClientBuilder {
  public static buildGrpcOptions(options: IGrpcClientProxyBuilderOptions): GrpcOptions {
    GrpcProtoPathHelper.existPaths(options.baseDir);

    const protoPath = GrpcProtoPathHelper.joinBase(options.baseDir, options.protoPath);

    GrpcProtoPathHelper.existPaths(protoPath);

    let includeDirs = [options.baseDir];
    if (options.includeDirs?.length) {
      GrpcProtoPathHelper.existPaths(options.includeDirs);
      includeDirs = options.includeDirs.concat([options.baseDir]);
    }

    const url = options.normalizeUrl ? UrlHelper.normalize(options.url) : options.url;

    if (url === false) {
      throw Error(`Не корректный формат url (${options.url})`);
    }

    return {
      transport: Transport.GRPC,
      options: {
        url,
        package: options.package,
        protoPath,
        loader: {
          includeDirs,
        },
      },
    };
  }

  public static buildClientGrpc<T extends object>(serviceName: string, clientGrpcProxy: ClientGrpcProxy): T {
    return clientGrpcProxy.getService<T>(serviceName);
  }

  public static buildClientGrpcProxy(options: IGrpcClientProxyBuilderOptions): ClientGrpcProxy {
    return GrpcClientBuilder.createClientGrpcProxy(GrpcClientBuilder.buildGrpcOptions(options));
  }

  private static createClientGrpcProxy(options: GrpcOptions): ClientGrpcProxy {
    return ClientProxyFactory.create(options) as ClientGrpcProxy;
  }
}
