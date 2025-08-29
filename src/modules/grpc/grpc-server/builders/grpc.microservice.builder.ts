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

    app.connectMicroservice<MicroserviceOptions>(
      GrpcMicroserviceBuilder.createGrpcOptions({
        url,
        services: options.services?.length ? options.services : [''],
        package: options.package,
        protoPath,
        includeDirs,
      }),
      {
        inheritAppConfig: true,
      },
    );
  }

  private static createGrpcOptions(
    options: Omit<IGrpcMicroserviceBuilderOptions & { protoPath: string[] }, 'baseDir'>,
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
          const initialStatusMap = {};

          options.services.forEach((service) => {
            initialStatusMap[service] = 'UNKNOWN';
          });

          const health = new HealthImplementation(initialStatusMap);

          health.addToServer(server);

          options.services.forEach((service) => {
            health.setStatus(service, 'SERVING');
          });

          new ReflectionService(pkg).addToServer(server);
        },
      },
    };
  }
}
