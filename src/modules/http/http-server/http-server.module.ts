import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { HttpHeadersToAsyncContextAdapter } from '../http-common/adapters/http.headers-to-async-context.adapter';
import { HttpHeadersResponseBuilder } from './builders/http.headers-response.builder';
import { HTTP_SERVER_HEADERS_ADAPTER_DI, HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI } from './types/tokens';
import { HttpErrorResponseFilter } from './filters/http.error-response.filter';
import { HttpResponseHandler } from './filters/http.response.handler';
import { HttpAuthGuard } from './guards/http.auth.guard';
import { HttpLogging } from './interceptors/http.logging';
import { HttpPrometheus } from './interceptors/http.prometheus';
import { HttpHeadersResponse } from './interceptors/http.response-headers';
import { IHttpServerModuleOptions } from './types/module.options';

@Module({})
export class HttpServerModule {
  public static forRoot(options?: IHttpServerModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule, ElkLoggerModule, AuthModule, PrometheusModule];
    let providers: Provider[] = [
      HttpResponseHandler,
      HttpAuthGuard,
      HttpLogging,
      HttpPrometheus,
      HttpHeadersResponse,
      HttpErrorResponseFilter,
      ProviderBuilder.build(HTTP_SERVER_HEADERS_ADAPTER_DI, {
        providerType: options?.headersToAsyncContextAdapter,
        defaultType: { useClass: HttpHeadersToAsyncContextAdapter },
      }),
      ProviderBuilder.build(HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI, {
        providerType: options?.headersResponseBuilder,
        defaultType: { useClass: HttpHeadersResponseBuilder },
      }),
    ];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }

    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: HttpServerModule,
      global: true,
      imports,
      providers,
      exports: [
        HTTP_SERVER_HEADERS_ADAPTER_DI,
        HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI,
        HttpAuthGuard,
        HttpLogging,
        HttpPrometheus,
        HttpHeadersResponse,
        HttpErrorResponseFilter,
      ],
    };
  }
}
