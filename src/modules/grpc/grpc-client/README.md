# Grpc Client Module

## Описание

Модуль для создания `GrpcClientService` — **gRPC**-клиента с логированием интеграций, метриками Prometheus, обработкой ошибок и повторной отправкой запросов.

Все ошибки, возникшие при отправке запроса, приводятся к одному из типов:

- `GrpcClientExternalError` — сетевая ошибка или ошибка на стороне внешней системы (любой `ServiceError` с `code`-статусом gRPC).
- `GrpcClientInternalError` — ошибка в клиентском коде (некорректные данные запроса, сериализация, конфигурация и т. п.).
- `GrpcClientTimeoutError` — ответ не получен в рамках установленных временных ограничений (`requestOptions.timeout` или `retryOptions.timeout`).

Все три наследуются от абстрактного `GrpcClientError` и содержат `LoggerMarker` (INTERNAL / EXTERNAL / UNKNOWN) для классификации в логах.

## Параметры окружения

| Параметр окружения (**env**) | Обязательный | Значения | Описание |
|---|---|---|---|
| `GRPC_CLIENT_RETRY_ENABLED` | нет. По умолчанию: **no** (`.example.env` ставит **yes**) | Строка: **yes** / **no** (без учёта регистра) | Включает/отключает повторную отправку **gRPC**-запросов. |
| `GRPC_CLIENT_REQUEST_TIMEOUT` | нет. По умолчанию: **15000** | Целое число (мс) | Таймаут одного **gRPC**-запроса. При превышении выбрасывается `GrpcClientTimeoutError`. |
| `GRPC_CLIENT_RETRY_TIMEOUT` | нет. По умолчанию: **120000** | Целое число (мс) | Общий таймаут процесса переотправки (`GrpcClientService.request`). При превышении выбрасывается `GrpcClientTimeoutError`. Значение `0` отключает общий таймаут. |
| `GRPC_CLIENT_RETRY_DELAY` | нет. По умолчанию: **5000** | Целое число (мс) | Пауза между повторными попытками. |
| `GRPC_CLIENT_RETRY_MAX_COUNT` | нет. По умолчанию: **5** | Целое число | Максимальное количество повторных попыток. При превышении выбрасывается последняя полученная ошибка. `0` — неограниченное количество (ограничено `RETRY_TIMEOUT`). |
| `GRPC_CLIENT_RETRY_STATUS_CODES` | нет. По умолчанию: **4,14,timeout** | Список через запятую | Статусы, при которых выполняется повторный запрос. Значения — числовые gRPC-статусы (`4` = `DEADLINE_EXCEEDED`, `14` = `UNAVAILABLE`) либо строка `timeout` для локального таймаута. |

## `GrpcClientService`

Основной сервис клиента. Принимает `IGrpcRequest<R>` и возвращает `Promise<Res>`. Под капотом:

1. Формирует `Metadata` через `IGrpcMetadataRequestBuilder` (по DI-токену `GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI`), включая данные из `GeneralAsyncContext.instance.extend()`.
2. Запускает таймер гистограммы `GRPC_EXTERNAL_REQUEST_DURATIONS`.
3. Вызывает метод `ClientGrpcProxy.getService(...)[method](...)`.
4. При ошибке — нормализует её в `GrpcClientError`, инкрементит `GRPC_EXTERNAL_REQUEST_FAILED`. Если статус входит в `retryOptions.statusCodes` и не превышены лимиты — выполняет повтор с `GRPC_EXTERNAL_REQUEST_RETRY` и паузой `retryOptions.delay`.

```ts
import { GrpcClientService } from 'src/modules/grpc/grpc-client';

constructor(private readonly grpcClient: GrpcClientService) {}

const response = await this.grpcClient.request<IMainRequest, IMainResponse>({
  service: 'MainService',
  method: 'doSomething',
  data: { id: 42 },
});
```

При необходимости можно точечно переопределить опции для конкретного запроса:

```ts
await this.grpcClient.request<IReq, IRes>(
  { service: 'MainService', method: 'doSomething', data },
  {
    requestOptions: { timeout: 30_000 },
    retryOptions: { retry: false },
    metadataBuilderOptions: { authToken: 'Bearer ...' },
  },
);
```

## `GrpcClientModule`

Динамический модуль для создания **gRPC**-клиента. Не является глобальным — регистрируется в каждом потребителе через `register(...)`.

```ts
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientModule } from 'src/modules/grpc/grpc-client';

@Module({
  imports: [
    GrpcClientModule.register({
      grpcClientProxyBuilderOptions: {
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          url: `${configService.get('REMOTE_GRPC_HOST')}:${configService.get('REMOTE_GRPC_PORT')}`,
          package: 'demo.service',
          baseDir: join(__dirname, '../../../../protos'),
          protoPath: ['/demo/service/MainService.proto'],
          includeDirs: [],
        }),
      },
    }),
  ],
})
export class MainServiceIntegrationModule {}
```

### Опции `GrpcClientModule.register(options)` — `IGrpcClientModuleOptions`

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` (`ModuleMetadata['imports']`) | Нет | `[]` | Дополнительные модули к базовому списку (`ConfigModule`, `ElkLoggerModule`, `AuthModule`, `PrometheusModule`). Нужны, если `providers` из них используются в фабриках `useFactory`. |
| `providers` | `Provider[]` (`@nestjs/common`) | Нет | `[]` | Дополнительные provider-ы модуля. |
| `grpcClientProxyBuilderOptions` | `IServiceClassProvider<IGrpcClientProxyBuilderOptions>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Да | — | Provider опций построения `ClientGrpcProxy`; результат привязывается к токену `GRPC_CLIENT_PROXY_BUILDER_OPTIONS_DI`, итоговый `ClientGrpcProxy` — к `GRPC_CLIENT_PROXY_DI`. |
| `grpcClientProxyBuilderOptions.useClass` | `Type<IGrpcClientProxyBuilderOptions>` | — | — | Класс опций для `useClass`. |
| `grpcClientProxyBuilderOptions.useValue` | `IGrpcClientProxyBuilderOptions` | — | — | Готовое значение опций. |
| `grpcClientProxyBuilderOptions.useFactory` | `(...deps) => IGrpcClientProxyBuilderOptions \| Promise<...>` | — | — | Фабрика опций. |
| `grpcClientProxyBuilderOptions.inject` | `FactoryProvider['inject']` | Нет | `[]` | Зависимости фабрики (например, `ConfigService`). |
| `grpcClientProxyBuilderOptions.useValue.url` | `string` | Да | — | Адрес целевого **gRPC**-сервера (`host:port`). |
| `grpcClientProxyBuilderOptions.useValue.package` | `string` | Да | — | Имя пакета из **proto**-файла. |
| `grpcClientProxyBuilderOptions.useValue.baseDir` | `string` | Да | — | Корневой каталог для разрешения `protoPath`. |
| `grpcClientProxyBuilderOptions.useValue.protoPath` | `string \| string[]` | Да | — | Путь (или список путей) к **proto**-файлам относительно `baseDir`. |
| `grpcClientProxyBuilderOptions.useValue.includeDirs` | `string[]` | Нет | `[]` | Дополнительные каталоги поиска импортов `.proto`. |
| `grpcClientProxyBuilderOptions.useValue.normalizeUrl` | `boolean` | Нет | `false` | Нормализовать ли `url` через `UrlHelper.normalize` (удаление схемы, и т. п.). |
| `metadataRequestBuilder` | `IServiceClassProvider<IGrpcMetadataRequestBuilder>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `{ useClass: GrpcMetadataRequestBuilder }` | Реализация `IGrpcMetadataRequestBuilder`, привязываемая к `GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI`. |
| `metadataRequestBuilder.useClass` | `Type<IGrpcMetadataRequestBuilder>` | — | `GrpcMetadataRequestBuilder` | Класс реализации. |
| `metadataRequestBuilder.useValue` | `IGrpcMetadataRequestBuilder` | — | — | Готовый экземпляр. |
| `metadataRequestBuilder.useFactory` | `(...deps) => IGrpcMetadataRequestBuilder \| Promise<...>` | — | — | Фабрика. |
| `metadataRequestBuilder.inject` | `FactoryProvider['inject']` | Нет | `[]` | Зависимости фабрики. |
| `requestOptions` | `IServiceClassProvider<IGrpcRequestOptions>` \| `IServiceValueProvider<IGrpcRequestOptions>` \| `IServiceFactoryProvider<IGrpcRequestOptions>` | Нет | `{ useValue: {} }` | Provider `IGrpcRequestOptions` — значения по умолчанию для `GrpcClientService.request()`; переопределяются во втором аргументе вызова. Привязан к `GRPC_CLIENT_REQUEST_OPTIONS_DI`. |
| `requestOptions.useValue.metadataBuilderOptions.useZipkin` | `boolean` | Нет | `false` | Проставлять Zipkin-заголовки в `Metadata`. |
| `requestOptions.useValue.metadataBuilderOptions.asArray` | `boolean` | Нет | `false` | Передавать значения `Metadata` массивами. |
| `requestOptions.useValue.metadataBuilderOptions.authToken` | `string` | Нет | — | Значение заголовка `Authorization`. |
| `requestOptions.useValue.requestOptions.timeout` | `number` (мс) | Нет | `GRPC_CLIENT_REQUEST_TIMEOUT` | Таймаут одного **gRPC**-запроса. |
| `requestOptions.useValue.retryOptions.retry` | `boolean` | Нет | Значение `GRPC_CLIENT_RETRY_ENABLED` | Включить/отключить retry. |
| `requestOptions.useValue.retryOptions.timeout` | `number` (мс) | Нет | `GRPC_CLIENT_RETRY_TIMEOUT` | Общий таймаут процесса `request()`. |
| `requestOptions.useValue.retryOptions.delay` | `number` (мс) | Нет | `GRPC_CLIENT_RETRY_DELAY` | Пауза между повторами. |
| `requestOptions.useValue.retryOptions.retryMaxCount` | `number` | Нет | `GRPC_CLIENT_RETRY_MAX_COUNT` | Максимальное число повторов. |
| `requestOptions.useValue.retryOptions.statusCodes` | `Array<string \| number>` | Нет | `GRPC_CLIENT_RETRY_STATUS_CODES` | Статусы, при которых выполняется retry. |

Экспортируется: `GRPC_CLIENT_PROXY_DI`, `GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI`, `GrpcClientResponseHandler`, `GrpcClientService`.

## `GrpcClientBuilder`

Низкоуровневый билдер, используемый внутри `GrpcClientModule`. Применять напрямую, как правило, не нужно — предпочтительнее `GrpcClientModule.register(...)`.

- `GrpcClientBuilder.buildGrpcOptions(options)` — возвращает `GrpcOptions` (**@see** `@nestjs/microservices`), полезно для настройки `GRPCHealthIndicator` (**@see** `@nestjs/terminus`).
- `GrpcClientBuilder.buildClientGrpcProxy(options)` — создаёт `ClientGrpcProxy` на основе **proto**-файлов.
- `GrpcClientBuilder.buildClientGrpc<T>(serviceName, clientGrpcProxy)` — получает типизированный сервис из `ClientGrpcProxy`.

## `IGrpcMetadataRequestBuilder`

Интерфейс билдера `Metadata` для исходящих **gRPC**-запросов (расширение `IGrpcMetadataBuilder` из `grpc-common`). Дефолтная реализация — `GrpcMetadataRequestBuilder`. Дополнительные опции:

- `useZipkin` — включить распространение Zipkin-заголовков.
- `asArray` — передавать значения заголовков в виде массивов.
- `authToken` — проставить авторизационный токен в `Metadata`.

## `GrpcClientResponseHandler`

Обработчик ответа и ошибок: приводит исключения к `GrpcClientError` и пишет соответствующий лог. Используется `GrpcClientService` как на успешном пути (`loggingResponse`), так и в `retry`/`catchError`.

## Форматеры логов

- `GrpcServiceErrorFormatter` — лог-форматер `ServiceError` (**@see** `@grpc/grpc-js`): `IObjectFormatter<ServiceError>`.
- `GrpcClientErrorFormatter` — лог-форматер `GrpcClientError`: `IObjectFormatter<GrpcClientError>`.

## DI-токены

- `GRPC_CLIENT_PROXY_BUILDER_OPTIONS_DI` — опции построения `ClientGrpcProxy`.
- `GRPC_CLIENT_PROXY_DI` — созданный `ClientGrpcProxy`.
- `GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI` — билдер `Metadata` исходящего запроса.
- `GRPC_CLIENT_REQUEST_OPTIONS_DI` — `IGrpcRequestOptions`, применяемые по умолчанию.

## Метрики

| Метрика | Метки | Описание |
|---|---|---|
| `GRPC_EXTERNAL_REQUEST_DURATIONS` | **labelNames** `['service', 'method']` | Гистограмма длительностей **gRPC**-запросов к внешним системам и их количество. |
| `GRPC_EXTERNAL_REQUEST_FAILED` | **labelNames** `['service', 'method', 'statusCode', 'type']` | Количество **gRPC**-запросов к внешним системам с ошибками. |
| `GRPC_EXTERNAL_REQUEST_RETRY` | **labelNames** `['service', 'method', 'statusCode', 'type']` | Количество повторных **gRPC**-запросов к внешним системам. |
