import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule, HttpModuleAsyncOptions, HttpModuleOptions } from '@nestjs/axios';
import { MILLISECONDS_IN_SECOND } from 'src/modules/date-timestamp';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import { AuthModule } from 'src/modules/auth';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import {
  HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI,
  HTTP_CLIENT_HTTP_MODULE_OPTIONS_DI,
  HTTP_CLIENT_REQUEST_OPTIONS_DI,
} from './types/tokens';
import { HttpClientModuleOptions, HttpOptions } from './types/module.options';
import { HttpClientService } from './services/http-client.service';
import { HttpHeadersRequestBuilder } from './builders/http.headers-request.builder';
import { HttpClientResponseHandler } from './filters/http-client.response.handler';
import { HttpClientConfigService } from './services/http-client.config.service';

@Module({})
export class HttpClientModule {
  public static register(options?: HttpClientModuleOptions): DynamicModule {
    const httpModuleOptions: HttpModuleAsyncOptions = {
      imports: [ConfigModule],
      inject: [HttpClientConfigService],
      extraProviders: [HttpClientConfigService],
      useFactory: (config: HttpClientConfigService) => ({
        timeout: config.getRequestTimeout(),
        transitional: { clarifyTimeoutError: true },
      }),
    };

    if (options?.httpModuleOptions) {
      let httpModuleProviders: Provider[] = [HttpClientConfigService];

      httpModuleOptions.imports = [ConfigModule];

      if (options.httpModuleOptions.imports?.length) {
        httpModuleOptions.imports = httpModuleOptions.imports.concat(options.httpModuleOptions.imports);
      }

      if (options.httpModuleOptions.providers?.length) {
        httpModuleProviders = httpModuleProviders.concat(options.httpModuleOptions.providers);
      }

      if (options.httpModuleOptions.options) {
        httpModuleProviders = httpModuleProviders.concat(
          ProviderBuilder.build(HTTP_CLIENT_HTTP_MODULE_OPTIONS_DI, {
            providerType: options.httpModuleOptions.options,
          }),
        );
      }

      httpModuleOptions.extraProviders = httpModuleProviders;

      httpModuleOptions.useFactory = (config: HttpClientConfigService, httpOptions: HttpOptions) => {
        const options: HttpModuleOptions = {
          ...httpOptions,
        };

        if (!options.timeout) {
          options.timeout = config.getRequestTimeout();
        }

        if (options.transitional) {
          options.transitional.clarifyTimeoutError = true;
        } else {
          options.transitional = { clarifyTimeoutError: true };
        }

        options.timeoutErrorMessage = `HTTP Request Timeout (${options.timeout / MILLISECONDS_IN_SECOND} sec)`;

        return options;
      };

      httpModuleOptions.inject = [HttpClientConfigService, HTTP_CLIENT_HTTP_MODULE_OPTIONS_DI];
    }

    let imports: ImportsType = [
      ConfigModule,
      ElkLoggerModule,
      AuthModule,
      PrometheusModule,
      HttpModule.registerAsync(httpModuleOptions),
    ];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }

    let providers: Provider[] = [
      HttpClientConfigService,
      HttpClientResponseHandler,
      HttpClientService,
      ProviderBuilder.build(HTTP_CLIENT_REQUEST_OPTIONS_DI, {
        providerType: options?.requestOptions,
        defaultType: { useValue: {} },
      }),
      ProviderBuilder.build(HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI, {
        providerType: options?.headersRequestBuilder,
        defaultType: { useClass: HttpHeadersRequestBuilder },
      }),
    ];

    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: HttpClientModule,
      imports,
      providers,
      exports: [HttpClientResponseHandler, HttpClientService, HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI],
    };
  }
}
