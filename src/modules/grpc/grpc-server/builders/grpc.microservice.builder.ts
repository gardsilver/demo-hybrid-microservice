import { HealthImplementation, protoPath as healthCheckProtoPath } from 'grpc-health-check';
import { ReflectionService } from '@grpc/reflection';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport, GrpcOptions } from '@nestjs/microservices';
import { UrlHelper } from 'src/modules/common';
import { GrpcProtoPathHelper } from 'src/modules/grpc/grpc-common';
import { IGrpcMicroserviceBuilderOptions } from '../types/types';

export class GrpcMicroserviceBuilder {
  public static setup(app: NestExpressApplication, options: IGrpcMicroserviceBuilderOptions) {
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

    const grpcServices = options.services?.length ? options.services : [''];
    const grpcHealthImpl = GrpcMicroserviceBuilder.createHealthImplementation(grpcServices);

    app.connectMicroservice<MicroserviceOptions>(
      GrpcMicroserviceBuilder.createGrpcOptions({
        url,
        services: grpcServices,
        package: options.package,
        protoPath,
        includeDirs,
        grpcHealthImpl,
      }),
      {
        inheritAppConfig: true,
      },
    );

    return {
      grpcServices,
      grpcHealthImpl,
    };
  }

  private static createHealthImplementation(grpcServices: string[]): HealthImplementation {
    const initialStatusMap = {};

    grpcServices.forEach((service) => {
      initialStatusMap[service] = 'UNKNOWN';
    });

    return new HealthImplementation(initialStatusMap);
  }

  private static createGrpcOptions(
    options: Omit<IGrpcMicroserviceBuilderOptions & { protoPath: string[] }, 'baseDir'> & {
      grpcHealthImpl: HealthImplementation;
    },
  ): GrpcOptions {
    return {
      transport: Transport.GRPC,
      options: {
        url: options.url,
        package: options.package,
        protoPath: options.protoPath.concat([healthCheckProtoPath]),
        loader: {
          includeDirs: options.includeDirs,
        },
        onLoadPackageDefinition(pkg, server) {
          options.grpcHealthImpl.addToServer(server);

          options.services.forEach((service) => {
            options.grpcHealthImpl.setStatus(service, 'SERVING');
          });

          new ReflectionService(pkg).addToServer(server);
        },
      },
    };
  }
}
