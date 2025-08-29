import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import { AuthModule } from 'src/modules/auth';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import {
  GRPC_CLIENT_PROXY_BUILDER_OPTIONS_DI,
  GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI,
  GRPC_CLIENT_PROXY_DI,
  GRPC_CLIENT_REQUEST_OPTIONS_DI,
} from './types/tokens';
import { IGrpcClientProxyBuilderOptions } from './types/types';
import { IGrpcClientModuleOptions } from './types/module.options';
import { GrpcMetadataRequestBuilder } from './builders/grpc.metadata-request.builder';
import { GrpcClientBuilder } from './builders/grpc-client.builder';
import { GrpcClientResponseHandler } from './filters/grpc-client.response.handler';
import { GrpcClientService } from './services/grpc-client.service';
import { GrpcClientConfigService } from './services/grpc-client.config.service';

@Module({})
export class GrpcClientModule {
  public static register(options: IGrpcClientModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule, ElkLoggerModule, AuthModule, PrometheusModule];
    let providers: Provider[] = [GrpcClientConfigService, GrpcClientResponseHandler, GrpcClientService];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }

    providers = providers.concat(
      ProviderBuilder.build(GRPC_CLIENT_PROXY_BUILDER_OPTIONS_DI, {
        providerType: options.grpcClientProxyBuilderOptions,
      }),
      {
        provide: GRPC_CLIENT_PROXY_DI,
        inject: [GRPC_CLIENT_PROXY_BUILDER_OPTIONS_DI],
        useFactory: (options: IGrpcClientProxyBuilderOptions) => {
          return GrpcClientBuilder.buildClientGrpcProxy(options);
        },
      },
      ProviderBuilder.build(GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI, {
        providerType: options.metadataRequestBuilder,
        defaultType: { useClass: GrpcMetadataRequestBuilder },
      }),
      ProviderBuilder.build(GRPC_CLIENT_REQUEST_OPTIONS_DI, {
        providerType: options?.requestOptions,
        defaultType: { useValue: {} },
      }),
    );

    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: GrpcClientModule,
      imports,
      providers,
      exports: [
        GRPC_CLIENT_PROXY_DI,
        GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI,
        GrpcClientResponseHandler,
        GrpcClientService,
      ],
    };
  }
}
