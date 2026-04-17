# Grpc Server Module

## Описание

Модуль для создания и настройки **gRPC**-сервера: **Guards**, **Interceptors**, **Filters**, билдер микросервиса, адаптер `Metadata → AsyncContext`, интеграция `gRPC Health Check` и `gRPC Reflection`.

Подключается глобально через `GrpcServerModule.forRoot(...)` и экспортирует провайдеры `GRPC_SERVER_HEADERS_ADAPTER_DI`, `GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI`, а также `GrpcErrorResponseFilter`, `GrpcAuthGuard`, `GrpcLogging`, `GrpcPrometheus`, `GrpcServerStatusService`.

### Опции `GrpcServerModule.forRoot(options)` — `IGrpcServerModuleOptions`

Все поля опциональны. Если `options` не передан — подключаются реализации по умолчанию.

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` (`ModuleMetadata['imports']`) | Нет | `[]` | Дополнительные модули к базовому списку (`ConfigModule`, `ElkLoggerModule`, `AuthModule`, `PrometheusModule`). |
| `providers` | `Provider[]` (`@nestjs/common`) | Нет | `[]` | Дополнительные provider-ы к встроенным (`GrpcResponseHandler`, `GrpcErrorResponseFilter`, `GrpcAuthGuard`, `GrpcLogging`, `GrpcPrometheus`, `GrpcServerStatusService`, адаптеры). |
| `headersToAsyncContextAdapter` | `IServiceClassProvider<IGrpcHeadersToAsyncContextAdapter>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `{ useClass: GrpcHeadersToAsyncContextAdapter }` | Реализация адаптера `Metadata → AsyncContext`, привязываемая к токену `GRPC_SERVER_HEADERS_ADAPTER_DI`. |
| `headersToAsyncContextAdapter.useClass` | `Type<IGrpcHeadersToAsyncContextAdapter>` | — | `GrpcHeadersToAsyncContextAdapter` | Класс реализации для варианта `useClass`. |
| `headersToAsyncContextAdapter.useValue` | `IGrpcHeadersToAsyncContextAdapter` | — | — | Готовый экземпляр для варианта `useValue`. |
| `headersToAsyncContextAdapter.useFactory` | `(...deps) => IGrpcHeadersToAsyncContextAdapter \| Promise<...>` | — | — | Фабрика для варианта `useFactory`. |
| `headersToAsyncContextAdapter.inject` | `FactoryProvider['inject']` | Нет | `[]` | Зависимости фабрики. |
| `metadataResponseBuilder` | `IServiceClassProvider<IGrpcMetadataResponseBuilder>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `{ useClass: GrpcMetadataResponseBuilder }` | Реализация билдера `Metadata` ответа, привязываемая к токену `GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI`. |
| `metadataResponseBuilder.useClass` | `Type<IGrpcMetadataResponseBuilder>` | — | `GrpcMetadataResponseBuilder` | Класс реализации. |
| `metadataResponseBuilder.useValue` | `IGrpcMetadataResponseBuilder` | — | — | Готовый экземпляр. |
| `metadataResponseBuilder.useFactory` | `(...deps) => IGrpcMetadataResponseBuilder \| Promise<...>` | — | — | Фабрика. |
| `metadataResponseBuilder.inject` | `FactoryProvider['inject']` | Нет | `[]` | Зависимости фабрики. |

```ts
import { GrpcServerModule } from 'src/modules/grpc/grpc-server';

@Module({
  imports: [
    GrpcServerModule.forRoot(),
  ],
})
export class MainModule {}
```

## `GrpcMicroserviceBuilder`

Создаёт **gRPC**-микросервис на базе **proto**-файлов и подключает его к NestJS-приложению (`app.connectMicroservice`). Автоматически регистрирует:

- `HealthImplementation` из `grpc-health-check` — сервисы из `options.services` переводятся в состояние `SERVING`.
- `ReflectionService` из `@grpc/reflection` — для работы `grpcurl` и аналогичных инструментов.

Статус **Health Check** публикуется через `GrpcServerStatusService.addGrpcHealthImplementation`.

```ts
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { GrpcMicroserviceBuilder, GrpcServerStatusService } from 'src/modules/grpc/grpc-server';

GrpcMicroserviceBuilder.setup(app, {
  url: `${app.get(ConfigService).get('GRPC_HOST')}:${app.get(ConfigService).get('GRPC_PORT')}`,
  package: ['demo.service'],
  baseDir: join(__dirname, '../protos'),
  protoPath: ['/demo/service/MainService.proto'],
  services: ['demo.service.MainService'],
  includeDirs: [],
  normalizeUrl: true,
  statusService: app.get(GrpcServerStatusService),
});

await app.startAllMicroservices();
```

## Регистрация gRPC-обработчика

```ts
import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GrpcAuthGuard, GrpcLogging, GrpcPrometheus } from 'src/modules/grpc/grpc-server';

@UseGuards(GrpcAuthGuard)
@UseInterceptors(GrpcLogging, GrpcPrometheus)
@Controller()
export class MainGrpcController {
  @GrpcMethod('MainService', 'doSomething')
  async doSomething(data: IRequest): Promise<IResponse> {
    // ...
  }
}
```

Модуль контроллера импортирует `GrpcServerModule` транзитивно (глобальный), поэтому достаточно зарегистрировать контроллер в `HybridServerModule` / `GrpcApiModule`.

## Обработка входящих запросов и асинхронный контекст

Для восстановления данных асинхронного контекста используется адаптер `IGrpcHeadersToAsyncContextAdapter` (**@see** `src/modules/grpc/grpc-common`). По умолчанию подставляется `GrpcHeadersToAsyncContextAdapter`, заменить можно через `GrpcServerModule.forRoot({ headersToAsyncContextAdapter })`.

```ts
import { Inject, ExecutionContext } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { IGeneralAsyncContext } from 'src/modules/common';
import { GrpcHeadersHelper, IGrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { GRPC_SERVER_HEADERS_ADAPTER_DI } from 'src/modules/grpc/grpc-server';

constructor(
  @Inject(GRPC_SERVER_HEADERS_ADAPTER_DI)
  private readonly headersAdapter: IGrpcHeadersToAsyncContextAdapter<IGeneralAsyncContext>,
) {}

const rpc = ctx.switchToRpc(); // ctx: ExecutionContext
const metadata = rpc.getContext<Metadata>();
const headers = GrpcHeadersHelper.normalize(metadata.getMap());
const asyncContext = this.headersAdapter.adapt(headers);
```

### ВАЖНО

Обратите внимание на [Request lifecycle](https://docs.nestjs.com/faq/request-lifecycle). На этапах **Middleware**, **Guards**, **Interceptors**, **Pipes** `AsyncContext` ещё не создан. Чтобы избежать неконтролируемой повторной генерации, созданный контекст сохраняется в `Metadata` **gRPC**-запроса и переиспользуется на последующих этапах:

```ts
import { IGeneralAsyncContext } from 'src/modules/common';
import { GrpcMetadataHelper } from 'src/modules/grpc/grpc-server';

let asyncContext: IGeneralAsyncContext = GrpcMetadataHelper.getAsyncContext<IGeneralAsyncContext>(metadata);

if (asyncContext === undefined) {
  asyncContext = this.headersAdapter.adapt(headers);
  GrpcMetadataHelper.setAsyncContext(asyncContext, metadata);
}
```

## `GrpcMetadataHelper`

Позволяет в `Metadata` **gRPC**-запроса сохранять авторизационные данные и `AsyncContext`, полученные из данных запроса.

- `GrpcMetadataHelper.setAuthInfo` — сохраняет `IAuthInfo` (**@see** `src/modules/auth`) в `Metadata`.
- `GrpcMetadataHelper.getAuthInfo` — извлекает `IAuthInfo` из `Metadata`.
- `GrpcMetadataHelper.setAsyncContext` — сохраняет `IAsyncContext` (**@see** `src/modules/async-context`) в `Metadata`.
- `GrpcMetadataHelper.getAsyncContext` — извлекает `IAsyncContext` из `Metadata`.

## `IGrpcMetadataResponseBuilder`

Для формирования `Metadata` **gRPC**-ответа используйте сервис, реализующий `IGrpcMetadataResponseBuilder`. По умолчанию — `GrpcMetadataResponseBuilder`, можно заменить через `GrpcServerModule.forRoot({ metadataResponseBuilder })`.

```ts
import { Inject } from '@nestjs/common';
import { GeneralAsyncContext } from 'src/modules/common';
import { GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI, IGrpcMetadataResponseBuilder } from 'src/modules/grpc/grpc-server';

constructor(
  @Inject(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI)
  private readonly grpcMetadataResponseBuilder: IGrpcMetadataResponseBuilder,
) {}

const metadataResponse = this.grpcMetadataResponseBuilder.build({
  asyncContext: GeneralAsyncContext.instance.extend(),
  metadata: metadataRequest,
});
```

## `GrpcAuthGuard`

Проверка авторизации входящих **gRPC**-запросов. Подключается как к контроллеру/методу, так и глобально.

```ts
import { GrpcAuthGuard } from 'src/modules/grpc/grpc-server';

app.useGlobalGuards(app.get(GrpcAuthGuard));
```

```ts
import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GrpcAuthGuard } from 'src/modules/grpc/grpc-server';

@UseGuards(GrpcAuthGuard)
@Controller()
export class GrpcController {
  @UseGuards(GrpcAuthGuard)
  @GrpcMethod('MainService', 'index')
  async index(...): Promise<...> { /* ... */ }
}
```

Передача `GrpcAuthGuard` в декоратор `@SkipInterceptors(GrpcAuthGuard)` (**@see** `src/modules/common`) позволяет отключать `GrpcAuthGuard` на уровне контроллера/метода.

## `GrpcLogging`

Интерцептор логирования **gRPC**-запросов/ответов. Подключается как к контроллеру/методу, так и глобально.

```ts
import { GrpcLogging } from 'src/modules/grpc/grpc-server';

app.useGlobalInterceptors(app.get(GrpcLogging));
```

Передача `GrpcLogging` в декоратор `@SkipInterceptors(GrpcLogging)` отключает интерцептор для отдельного контроллера/метода.

### ВАЖНО

Если интерцептор `GrpcLogging` перехватывает ошибку, он применяет `GrpcResponseHandler.handleError`: приводит ошибку к `RpcException` (**@see** `@nestjs/microservices`) и пишет соответствующий лог. Поэтому в `GrpcErrorResponseFilter` ошибка попадает уже в преобразованном виде.

## `GrpcPrometheus`

Интерцептор метрик обработки серверных **gRPC**-запросов. Подключается как к контроллеру/методу, так и глобально. Передача `GrpcPrometheus` в декоратор `@SkipInterceptors(GrpcPrometheus)` отключает интерцептор.

## `GrpcErrorResponseFilter`

Фильтр **gRPC**-ошибок. Перехваченные ошибки нормализуются и пишутся в логи через `GrpcResponseHandler.handleError`. Подключается через `@UseFilters`.

### ВАЖНО

При использовании [Hybrid application](https://docs.nestjs.com/faq/hybrid-application) НЕ подключайте `GrpcErrorResponseFilter` глобально — это делает общий `HybridErrorResponseFilter` (**@see** `src/modules/hybrid/hybrid-server`), который делегирует обработку по типу контекста. Для чисто **gRPC**-приложения допускается глобальная регистрация.

## `RpcExceptionFormatter`

Лог-форматер ошибки `RpcException` (**@see** `@nestjs/microservices`): `IObjectFormatter<RpcException>`.

## Декораторы параметров

- `@GrpcAuthInfo()` — извлекает `IAuthInfo` из `Metadata` запроса (сохранённый `GrpcAuthGuard` через `GrpcMetadataHelper.setAuthInfo`). Аргументов не принимает.

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| — | — | — | Декоратор не принимает аргументов. |
| **возвращает** | `IAuthInfo` | — | Данные авторизации, извлечённые из `@grpc/grpc-js` `Metadata` через `GrpcMetadataHelper.getAuthInfo`. |

- `@GrpcGeneralAsyncContext()` — извлекает `IGeneralAsyncContext` из `Metadata` запроса (сохранённый через `GrpcMetadataHelper.setAsyncContext`). Аргументов не принимает.

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| — | — | — | Декоратор не принимает аргументов. |
| **возвращает** | `IGeneralAsyncContext` | — | Асинхронный контекст запроса, извлечённый из `Metadata` через `GrpcMetadataHelper.getAsyncContext`. |

## `GrpcServerStatusService`

Сервис для управления статусами `gRPC Health Check`. `GrpcMicroserviceBuilder.setup` автоматически регистрирует `HealthImplementation` через `addGrpcHealthImplementation`; сервис используется также `HealthModule` для readiness-проверки.

## DI-токены

- `GRPC_SERVER_HEADERS_ADAPTER_DI` — провайдер `IGrpcHeadersToAsyncContextAdapter`.
- `GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI` — провайдер `IGrpcMetadataResponseBuilder`.

## Метрики

| Метрика | Метки | Описание |
|---|---|---|
| `GRPC_INTERNAL_REQUEST_DURATIONS` | **labelNames** `['service', 'method']` | Гистограмма длительностей выполнения серверных **gRPC**-запросов и их количество. |
| `GRPC_INTERNAL_REQUEST_FAILED` | **labelNames** `['service', 'method', 'statusCode']` | Количество серверных **gRPC**-запросов с ошибками. |
