import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { AuthModule } from 'src/modules/auth';
import { GrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { GRPC_SERVER_HEADERS_ADAPTER_DI, GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI } from './types/tokens';
import { IGrpcServerModuleOptions } from './types/module.options';
import { GrpcLogging } from './interceptors/grpc.logging';
import { GrpcAuthGuard } from './guards/grpc.auth.guard';
import { GrpcMetadataResponseBuilder } from './builders/grpc.metadata-response.builder';
import { GrpcResponseHandler } from './filters/grpc.response.handler';
import { GrpcErrorResponseFilter } from './filters/grpc.error-response.filter';
import { GrpcPrometheus } from './interceptors/grpc.prometheus';

@Module({})
export class GrpcServerModule {
  public static forRoot(options?: IGrpcServerModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule, ElkLoggerModule, AuthModule, PrometheusModule];
    let providers: Provider[] = [
      GrpcResponseHandler,
      GrpcErrorResponseFilter,
      GrpcAuthGuard,
      GrpcLogging,
      GrpcPrometheus,
      ProviderBuilder.build(GRPC_SERVER_HEADERS_ADAPTER_DI, {
        providerType: options?.headersToAsyncContextAdapter,
        defaultType: { useClass: GrpcHeadersToAsyncContextAdapter },
      }),
      ProviderBuilder.build(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI, {
        providerType: options?.metadataResponseBuilder,
        defaultType: { useClass: GrpcMetadataResponseBuilder },
      }),
    ];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }
    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: GrpcServerModule,
      global: true,
      imports,
      providers,
      exports: [
        GRPC_SERVER_HEADERS_ADAPTER_DI,
        GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI,
        GrpcErrorResponseFilter,
        GrpcAuthGuard,
        GrpcLogging,
        GrpcPrometheus,
      ],
    };
  }
}
