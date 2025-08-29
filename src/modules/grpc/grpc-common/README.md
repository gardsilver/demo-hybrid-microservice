# Grpc Common
## Описание
Основной функционал для работы с **gRPC** Request/Response.

## ВАЖНО
Для получения нормализованных заголовков `IHeaders` (**@see** `src/modules/common`) из **gRPC** Request/Response  используйте `GrpcHeadersHelper.normalize`.

```typescript
import { Metadata } from '@grpc/grpc-js';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';

...
const rpc = context.switchToRpc();
const metadata = rpc.getContext<Metadata>();
const headers = GrpcHeadersHelper.normalize(metadata.getMap());
...

```

## `IGrpcHeadersToAsyncContextAdapter`
Для получения данных контекста используйте адаптер соответствующий интерфейсу `IGrpcHeadersToAsyncContextAdapter`. Можно использовать `GrpcHeadersToAsyncContextAdapter` или реализовать свой.

## `IGrpcMetadataBuilder`
Для создания `Metadata` на основе данных асинхронного контекста используйте билдер соответствующий интерфейсу `IGrpcMetadataBuilder`. Можно использовать `GrpcMetadataBuilder` или реализовать свой.

## `GrpcAuthHelper`
Позволяет работать с **token**-авторизации.
 - `GrpcAuthHelper.token` - из `IHeaders` (**@see** `src/modules/common`) извлекает **token**-авторизации.

## `GrpcProtoPathHelper`
Позволяет проверять и нормализовать пути к **proto**-файлам.
 - `GrpcProtoPathHelper.existPaths` - проверяет существование соответствующих путей в файловой системе.
 - `GrpcMetadataHelper.joinBase` - локальные пути расширяет до полного пути.

## `MetadataObjectFormatter` 
Лог-форматер `Metadata` (**@see** `@grpc/grpc-js`): `IObjectFormatter<Metadata>`
