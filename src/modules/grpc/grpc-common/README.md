# Grpc Common

## Описание

Общий функционал для работы с **gRPC** **Request/Response**, используемый обеими сторонами — `grpc-server` и `grpc-client`. Содержит нормализацию заголовков, адаптер `Metadata → AsyncContext`, билдер `Metadata`, лог-форматер `Metadata` и хелперы для работы с **proto**-файлами и авторизацией.

## `GrpcHeadersHelper`

Для получения нормализованных заголовков `IHeaders` (**@see** `src/modules/common`) из **gRPC** `Metadata` используйте `GrpcHeadersHelper.normalize`.

```ts
import { Metadata } from '@grpc/grpc-js';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';

const rpc = context.switchToRpc();
const metadata = rpc.getContext<Metadata>();
const headers = GrpcHeadersHelper.normalize(metadata.getMap());
```

## `IGrpcHeadersToAsyncContextAdapter`

Интерфейс адаптера `IHeaders → IGeneralAsyncContext`. Используется для восстановления асинхронного контекста из входящих/исходящих **gRPC**-заголовков. Можно использовать дефолтный `GrpcHeadersToAsyncContextAdapter` либо реализовать собственный.

## `IGrpcMetadataBuilder`

Интерфейс билдера `Metadata` на основе данных асинхронного контекста. Общий для `grpc-server` (`IGrpcMetadataResponseBuilder`) и `grpc-client` (`IGrpcMetadataRequestBuilder`).

```ts
import { Metadata } from '@grpc/grpc-js';
import { IGeneralAsyncContext } from 'src/modules/common';

export interface IGrpcMetadataBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; metadata?: Metadata },
    options?: { useZipkin?: boolean; asArray?: boolean },
  ): Metadata;
}
```

Дефолтная реализация — `GrpcMetadataBuilder`.

## `GrpcAuthHelper`

Работа с **token**-авторизацией.

- `GrpcAuthHelper.token` — извлекает **token**-авторизации из `IHeaders` (**@see** `src/modules/common`).

## `GrpcProtoPathHelper`

Проверка и нормализация путей к **proto**-файлам. Используется в `GrpcMicroserviceBuilder` (server) и `GrpcClientBuilder` (client).

- `GrpcProtoPathHelper.existPaths` — проверяет существование указанных путей в файловой системе, бросает ошибку при отсутствии.
- `GrpcProtoPathHelper.joinBase` — локальные пути расширяет до полного пути относительно `baseDir`.

## `MetadataObjectFormatter`

Лог-форматер `Metadata` (**@see** `@grpc/grpc-js`): `IObjectFormatter<Metadata>`. Регистрируется в фабрике форматеров при включении `ObjectFormattersFactory`.
