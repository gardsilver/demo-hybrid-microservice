# Http Client Module

## Описание

Модуль для настройки и создания `HttpClientService` — **HTTP**-клиента, который пишет интеграционные логи, фиксирует метрики и реализует логику таймаутов и повторной отправки запросов.

Все ошибки при отправке запроса приводятся к иерархии `HttpClientError`:

- `HttpClientExternalError` — сетевая ошибка или ошибка на стороне внешней системы. `loggerMarker = LoggerMarkers.EXTERNAL`.
- `HttpClientInternalError` — ошибка в клиентском коде (некорректный URL, нетранспортируемые данные и т.п.). `loggerMarker = LoggerMarkers.INTERNAL`.
- `HttpClientTimeoutError` — ответ не получен в рамках установленных временных ограничений. `loggerMarker = LoggerMarkers.EXTERNAL`, `statusCode = 'timeout'` по умолчанию.

Ответ со статусом **Not Found** воспринимается как успешный и возвращается `null`.

## Параметры окружения

Читаются через `HttpClientConfigService` (префикс `HTTP_CLIENT_`).

| Параметр | По умолчанию | Тип | Описание |
|---|---|---|---|
| `HTTP_CLIENT_RETRY_ENABLED` | `no` | `yes` / `no` | Включает повторную отправку **HTTP**-запроса. В `.example.env` для deploy задано `yes`. |
| `HTTP_CLIENT_REQUEST_TIMEOUT` | `15000` | number (мс) | Таймаут одного **HTTP**-запроса. При превышении будет `HttpClientTimeoutError`. |
| `HTTP_CLIENT_RETRY_TIMEOUT` | `120000` | number (мс) | Общий таймаут процесса `HttpClientService.request` (включая все retry). При превышении — `HttpClientTimeoutError`. |
| `HTTP_CLIENT_RETRY_DELAY` | `5000` | number (мс) | Пауза между повторными запросами. |
| `HTTP_CLIENT_RETRY_MAX_COUNT` | `5` | number | Максимальное количество повторных запросов. При превышении возвращается последняя полученная ошибка. |
| `HTTP_CLIENT_RETRY_STATUS_CODES` | `408,502,503,504,ECONNABORTED,ETIMEDOUT,ECONNREFUSED,ECONNRESET` | CSV | Статус-коды / коды ошибок, при которых выполняется повторный запрос. |

## `IHttpHeadersRequestBuilder`

Для формирования заголовков **HTTP**-запроса используется сервис, соответствующий `IHttpHeadersRequestBuilder` (DI-токен `HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI`). Реализация по умолчанию — `HttpHeadersRequestBuilder` (наследуется от `HttpHeadersBuilder` из `http-common`). Можно заменить через опцию `headersRequestBuilder` в `register()`.

## `HttpClientService`

**HTTP**-клиент с методом `request<Req, Res>(request: IHttpRequest<Req>, options?: IHttpRequestOptions): Promise<Res>`. На каждый запрос:

- строит заголовки через `IHttpHeadersRequestBuilder`, подкладывая текущий `GeneralAsyncContext.instance.extend()`;
- пишет лог запроса и ответа;
- фиксирует длительность в `HTTP_EXTERNAL_REQUEST_DURATIONS`;
- при подходящей ошибке повторяет запрос (`retry` из `rxjs`), инкрементируя `HTTP_EXTERNAL_REQUEST_FAILED` и `HTTP_EXTERNAL_REQUEST_RETRY`;
- при превышении общего `retryOptions.timeout` выбрасывает `TimeoutError`, далее приводимый к `HttpClientTimeoutError`;
- `AxiosError` обрабатывает через `HttpClientResponseHandler` и приводит к `HttpClientError`.

Пример использования:

```ts
import { Inject, Injectable } from '@nestjs/common';
import {
  HttpClientService,
  HttpClientExternalError,
  HttpClientInternalError,
  HttpClientTimeoutError,
} from 'src/modules/http/http-client';

@Injectable()
export class ExternalApiService {
  constructor(private readonly httpClient: HttpClientService) {}

  async getUser(id: string): Promise<IUser | null> {
    try {
      return await this.httpClient.request<unknown, IUser>({
        method: 'GET',
        url: `/users/${id}`,
      });
    } catch (e) {
      if (e instanceof HttpClientTimeoutError) {
        // превышен таймаут запроса или общего процесса retry
      } else if (e instanceof HttpClientExternalError) {
        // ошибка на стороне внешней системы / сетевая
      } else if (e instanceof HttpClientInternalError) {
        // ошибка в клиентском коде
      }
      throw e;
    }
  }
}
```

## `AxiosErrorFormatter`

Лог-форматер ошибки `AxiosError` (**@see** `axios`): `IObjectFormatter<AxiosError>`.

## `HttpClientErrorFormatter`

Лог-форматер ошибки `HttpClientError`: `IObjectFormatter<HttpClientError>`.

## Метрики

| Метрика | Метки | Описание |
|---|---|---|
| `HTTP_EXTERNAL_REQUEST_DURATIONS` | `['method', 'hostname', 'pathname']` | Гистограмма длительностей запросов по **HTTP** к внешним системам и их количество |
| `HTTP_EXTERNAL_REQUEST_FAILED` | `['method', 'hostname', 'pathname', 'statusCode', 'type']` | Количество запросов по **HTTP** к внешним системам с ошибками |
| `HTTP_EXTERNAL_REQUEST_RETRY` | `['method', 'hostname', 'pathname', 'statusCode', 'type']` | Количество повторных запросов по **HTTP** к внешним системам |

## `HttpClientModule`

Динамический модуль, предназначенный для создания **HTTP**-клиентов, соответствующих одному микросервису. Подключается через `register()` и **не** является глобальным — регистрируется отдельно для каждой интеграции.

Пример подключения:

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientModule } from 'src/modules/http/http-client';

@Module({
  imports: [
    HttpClientModule.register({
      httpModuleOptions: {
        options: {
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            baseURL: config.get<string>('EXTERNAL_API_URL'),
            timeout: 5_000,
          }),
        },
      },
      requestOptions: {
        useValue: {
          retryOptions: {
            timeout: 20_000,
            delay: 5_000,
          },
        },
      },
    }),
  ],
})
export class ExternalApiModule {}
```

### Опции `HttpClientModule.register(options)` — `IHttpClientModuleOptions`

Опция `options` обязательна (минимум — пустой объект). Все поля верхнего уровня опциональны.

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` (`ModuleMetadata['imports']`) | Нет | `[]` | Дополнительные модули к базовому списку (`ConfigModule`, `ElkLoggerModule`, `AuthModule`, `PrometheusModule`, `HttpModule`). Нужны, если provider-ы из них используются в фабриках `useFactory`. |
| `providers` | `Provider[]` (`@nestjs/common`) | Нет | `[]` | Дополнительные provider-ы модуля (классовые/value/factory). |
| `headersRequestBuilder` | `IServiceClassProvider<IHttpHeadersRequestBuilder>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `{ useClass: HttpHeadersRequestBuilder }` | Реализация `IHttpHeadersRequestBuilder`, привязанная к токену `HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI`. Поддерживает любую из трёх форм provider-а. |
| `headersRequestBuilder.useClass` | `Type<IHttpHeadersRequestBuilder>` | — | `HttpHeadersRequestBuilder` | Класс реализации для варианта `useClass`. |
| `headersRequestBuilder.useValue` | `IHttpHeadersRequestBuilder` | — | — | Готовый экземпляр для варианта `useValue`. |
| `headersRequestBuilder.useFactory` | `(...deps) => IHttpHeadersRequestBuilder \| Promise<...>` | — | — | Фабрика для варианта `useFactory`. |
| `headersRequestBuilder.inject` | `FactoryProvider['inject']` | Нет | `[]` | Зависимости фабрики. |
| `httpModuleOptions` | `{ imports?: ImportsType; providers?: Provider[]; options: IServiceClassProvider<HttpOptions> \| IServiceValueProvider<HttpOptions> \| IServiceFactoryProvider<HttpOptions> }` | Нет | — | Настройка внутреннего `HttpModule` (**@see** `@nestjs/axios`). Если не задано — `HttpModule` подключается без параметров. |
| `httpModuleOptions.imports` | `ImportsType` | Нет | `[]` | Доп. модули для inject во внутренний `HttpModule.registerAsync`. |
| `httpModuleOptions.providers` | `Provider[]` | Нет | `[]` | Доп. provider-ы для внутреннего `HttpModule.registerAsync`. |
| `httpModuleOptions.options` | `IServiceClassProvider<HttpOptions>` \| `IServiceValueProvider<HttpOptions>` \| `IServiceFactoryProvider<HttpOptions>` | Да (если задан `httpModuleOptions`) | — | Provider для `HttpOptions = Partial<IHttpRequest>` (`baseURL`, `timeout`, `headers` и т.п.). Если `timeout` не указан — применяется `HTTP_CLIENT_REQUEST_TIMEOUT`. |
| `httpModuleOptions.options.useFactory` | `(...deps) => HttpOptions \| Promise<HttpOptions>` | — | — | Фабрика для варианта `useFactory`. |
| `httpModuleOptions.options.inject` | `FactoryProvider['inject']` | Нет | `[]` | Зависимости фабрики `options`. |
| `requestOptions` | `IServiceClassProvider<IHttpRequestOptions>` \| `IServiceValueProvider<IHttpRequestOptions>` \| `IServiceFactoryProvider<IHttpRequestOptions>` | Нет | `{ useValue: {} }` | Provider значений `IHttpRequestOptions` по умолчанию для `HttpClientService.request()`; точечно переопределяются во втором аргументе вызова. |
| `requestOptions.useValue.headersBuilderOptions` | `IHttpHeadersBuilderOptions` | Нет | — | Опции сборки заголовков для `IHttpHeadersRequestBuilder`. |
| `requestOptions.useValue.headersBuilderOptions.useZipkin` | `boolean` | Нет | `false` | Проставлять ли Zipkin-заголовки. |
| `requestOptions.useValue.headersBuilderOptions.asArray` | `boolean` | Нет | `false` | Передавать значения заголовков массивами. |
| `requestOptions.useValue.headersBuilderOptions.authToken` | `string` | Нет | — | Значение заголовка `Authorization`. |
| `requestOptions.useValue.retryOptions.retry` | `boolean` | Нет | Значение `HTTP_CLIENT_RETRY_ENABLED` | Включить/отключить retry для данного клиента. |
| `requestOptions.useValue.retryOptions.timeout` | `number` (мс) | Нет | `HTTP_CLIENT_RETRY_TIMEOUT` | Общий таймаут процесса `request()` (включая все попытки). |
| `requestOptions.useValue.retryOptions.delay` | `number` (мс) | Нет | `HTTP_CLIENT_RETRY_DELAY` | Пауза между попытками. |
| `requestOptions.useValue.retryOptions.retryMaxCount` | `number` | Нет | `HTTP_CLIENT_RETRY_MAX_COUNT` | Максимальное число повторов. |
| `requestOptions.useValue.retryOptions.statusCodes` | `Array<string \| number>` | Нет | `HTTP_CLIENT_RETRY_STATUS_CODES` | Статусы/коды ошибок, при которых выполняется retry. |

Экспортируемые провайдеры: `HttpClientService`, `HttpClientResponseHandler`, `HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI`.
