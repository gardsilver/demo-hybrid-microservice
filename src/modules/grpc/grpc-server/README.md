# Grpc Server Module

## Описание
Модуль для создания и настройки **gRPC**-сервера: **Middleware**, **Guards**, **Interceptors**, **Pipes** и т.д.


## Обработка входящих запросов.
Для получения данных асинхронного контекста выполнения необходимо использовать адаптер реализующий интерфейс `IGrpcHeadersToAsyncContextAdapter` (**@see** `src/modules/grpc/grpc-common`).  Можно использовать `GrpcHeadersToAsyncContextAdapter` (**@see** `src/modules/grpc/grpc-common`) или реализовать свой. 


```typescript
import { Inject, ExecutionContext } from '@nestjs/common';
import { IGeneralAsyncContext} from 'src/modules/common';
import { IGrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { GRPC_SERVER_HEADERS_ADAPTER_DI } from 'src/modules/grpc/grpc-server';

...
constructor(
    @Inject(GRPC_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IGrpcHeadersToAsyncContextAdapter<IGeneralAsyncContext>,
    ...
  ) { ... }
...

const rpc = ctx.switchToRpc(); // ctx: ExecutionContext
const metadata = rpc.getContext<Metadata>();
const headers = GrpcHeadersHelper.normalize(metadata.getMap());
const asyncContext = this.headersAdapter.adapt(headers);
```

### Важно
Обратите внимание на  [Request lifecycle](https://docs.nestjs.com/faq/request-lifecycle). При расширении функционала и сохранения логики сквозного логирования необходимо следить за построением `AsyncContext`. Поскольку на этапах **Middleware**, **Guards**, **Interceptors**, **Pipes** `AsyncContext` еще не создан, то во избежании не контролируемой генерации `AsyncContext` лучше созданный контекст сохранить в `Metadata` **gRPC**-запроса и в дальнейшем проверять, есть ли сохраненный контекст:

```typescript
import {
  IGeneralAsyncContext,
} from 'src/modules/common';
import { GrpcMetadataHelper } from 'src/modules/grpc/grpc-server';

...
  let asyncContext: IGeneralAsyncContext = GrpcMetadataHelper.getAsyncContext<IGeneralAsyncContext>(metadata);

  if (asyncContext === undefined) {
    asyncContext = this.headersAdapter.adapt(headers);
    GrpcMetadataHelper.setAsyncContext(asyncContext, metadata);
  }
...
```

## `GrpcMetadataHelper`
Позволяет в `Metadata` **gRPC**-запроса сохранять авторизационные данные `IAuthInfo` и `AsyncContext` полученные из данных запроса.
 - `GrpcMetadataHelper.setAuthInfo` - сохраняет `IAuthInfo` (**@see** `src/modules/auth`) в `Metadata`.
 - `GrpcMetadataHelper.getAuthInfo` - извлекает `IAuthInfo` (**@see** `src/modules/auth`) в `Metadata`.
 - `GrpcMetadataHelper.setAsyncContext` - сохраняет `IAsyncContext` (**@see** `src/modules/async-context`) в `Metadata`.
 - `GrpcMetadataHelper.getAsyncContext` - извлекает `IAsyncContext` (**@see** `src/modules/async-context`) в `Metadata`.

## `IGrpcMetadataResponseBuilder`
Для формирования `Metadata` **gRPC**-ответа используйте сервис соответствующий интерфейсу `IGrpcMetadataResponseBuilder`.  Можно использовать `GrpcMetadataResponseBuilder` или реализовать свой. 

```typescript
import { Inject } from '@nestjs/common';
import { GeneralAsyncContext } from 'src/modules/common';
import { GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI, IGrpcMetadataResponseBuilder } from 'src/modules/grpc/grpc-server';

...
  constructor(
    @Inject(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI)
    private readonly grpcMetadataResponseBuilder: IGrpcMetadataResponseBuilder,
  ) {}
...

  const metadataResponse = this.grpcMetadataResponseBuilder.build({
    asyncContext: GeneralAsyncContext.instance.extend(),
    metadata: metadataRequest,
  });

```

## `RpcExceptionFormatter` 
Лог-форматер ошибки `RpcException` (**@see** `@nestjs/microservices`): `IObjectFormatter<RpcException>`

## `GrpcAuthGuard`

Проверка авторизации входящих **gRPC**-запросов. Можно подключать как в класса/методе, так и глобально.

Пример подключения глобально

```typescript
import { GrpcAuthGuard } from 'src/modules/grpc/grpc-server';

...
  app.useGlobalGuards(
    app.get(GrpcAuthGuard),
  );
...
```

Пример подключения к контроллеру
```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GrpcAuthGuard } from 'src/modules/grpc/grpc-server';

...

@UseGuards(GrpcAuthGuard)
@Controller()
export class GrpcController {
  
  // Или
  @UseGuards(GrpcAuthGuard)
  @GrpcMethod(...)
  async index(...): Promise<...> { ... }

}
...
```

При этом опция **GrpcAuthGuard** в декораторе `SkipInterceptors` (**@see** `src/modules/common`) позволяет отключать `GrpcAuthGuard`.


## `GrpcLogging`

Интерцептор логирования **gRPC**-запросов/**gRPC**-ответов. Можно подключать как в класса/методе, так и глобально.

Пример подключения глобально

```typescript
import { GrpcLogging } from 'src/modules/grpc/grpc-server';

...
  app.useGlobalInterceptors(
    app.get(GrpcLogging),
  );
...
```
Пример подключения к контроллеру
```typescript
import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GrpcLogging } from 'src/modules/grpc/grpc-server';

...

@UseInterceptors(GrpcLogging)
@Controller()
export class GrpcController {
  
  @UseInterceptors(GrpcLogging)
  @GrpcMethod(...)
  async index(...): Promise<...> { ... }

}
...
```
При этом опция **GrpcLogging** в декораторе `SkipInterceptors` (**@see** `src/modules/common`) позволяет отключать `GrpcLogging`.

### ВАЖНО
Если интерцептор `GrpcLogging` перехватывает ошибку, то применяет `GrpcResponseHandler.handleError`:  приводит ошибку к `RpcException` (**@see** `@nestjs/microservices`) и пишет соответствующий лог. 
Поэтому ошибка в `GrpcErrorResponseFilter` попадет в преобразованном виде.


## `GrpcErrorResponseFilter`
Фильтр **gRPC**-ошибок. Перехваченные ошибки нормализуются и пишутся в логи с использованием `GrpcResponseHandler.handleError`.
Можно подключать с использованием `@UseFilters` (**@see** `@nestjs/common`). 

### ВАЖНО
При использовании [Hybrid application](https://docs.nestjs.com/faq/hybrid-application) не подключать `GrpcErrorResponseFilter` глобально.
Для не **Hybrid application** допускается глобальное подключение.

## `GrpcPrometheus`
Интерцептор метрик обработки серверных **gRPC**-запросов. Можно подключать как в контроллере/методе, так и глобально.
При этом опция **GrpcPrometheus** в декораторе `SkipInterceptors` (**@see** `src/modules/common`) позволяет отключать `GrpcPrometheus`.

## `GrpcMicroserviceBuilder`
Позволяет создавать **gRPC**-сервер на основе **proto**-файлов. Автоматически настраивает **gPRC Health Check** и **gRPC Reflection**.

Пример подключение **gRPC**-сервера:

```typescript
import { ConfigService} from '@nestjs/config';
import { GrpcMicroserviceBuilder } from 'src/modules/grpc/grpc-server';

...
  GrpcMicroserviceBuilder.setup(app, {
    url: app.get(ConfigService).get(...),
    package: ['grpc.server'],
    baseDir: join(__dirname, '../protos'),
    protoPath: ['/grpc/server/GrpcServer.proto'],
    normalizeUrl: true,
  });
...
  await app.startAllMicroservices();

```

## Декораторы параметров  `GrpcAuthInfo` и `GrpcGeneralAsyncContext`
Позволяют быстро получить данные авторизации и `AsyncContext` из `Metadata` **gRPC**-запроса.


## Метрики
| Метрика| Метки |Описание|
|---|---|---|
|`GRPC_INTERNAL_REQUEST_DURATIONS`|**labelNames** `['service', 'method']`| Гистограмма длительностей выполнения серверных **gRPC**-запросов и их количество |
|`GRPC_INTERNAL_REQUEST_FAILED`|**labelNames** `['service', 'method', 'statusCode']`| Количество серверных **gRPC**-запросов с ошибками|

