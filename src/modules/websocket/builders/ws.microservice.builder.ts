import { ServerOptions } from 'socket.io';
import { INestApplication } from '@nestjs/common';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from 'src/modules/http/http-server';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { IWsMicroserviceBuilderOptions } from '../types/types';
import { TelemetryIoAdapter } from '../adapters/telemetry-io.adapter';

export abstract class WsMicroserviceBuilder {
  public static setup(app: INestApplication, options?: IWsMicroserviceBuilderOptions): void {
    const configOptions = options?.serverOptions ?? ({} as unknown as Partial<ServerOptions>);

    const headersAdapter =
      options?.headersAdapter ?? app.get<IHttpHeadersToAsyncContextAdapter>(HTTP_SERVER_HEADERS_ADAPTER_DI);

    if (!headersAdapter) {
      throw new Error(
        'Не удалось инициализировать WebSocket телеметрию. Адаптер заголовков не передан в опциях и отсутствует в DI-контейнере.',
      );
    }

    const telemetryIoAdapter = new TelemetryIoAdapter(app, configOptions, headersAdapter);
    app.useWebSocketAdapter(telemetryIoAdapter);
  }
}
