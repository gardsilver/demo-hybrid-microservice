# Grpc Client Module

## Описание
Модуль для создания `GrpcClientService` **gRPC**-клиента - пишет логи интеграции и фиксирует соответствующие метрики, реализована логика обработки полученных ошибок и повторной отправки запросов.

Все ошибки, возникшие при отправки запроса будут приведены к виду:
  - `GrpcClientExternalException` - если возникла сетевая ошибка или ошибка на стороне внешней системы.
  - `GrpcClientInternalException` - если ошибка возникла в клиентском коде. Например подготовленные данные для отправки некорректны: url неподдерживаемого протокола, или данные запроса не возможно сериализовать (содержат циклические ссылки) и т.п..
  - `GrpcClientTimeoutError` - ответ не был получен в рамках установленных временных ограничений.

### Параметры окружения
| Параметры окружения (**env**)| Обязательный | Возможные значения | Описание|
|---|---|---|---|
|`GRPC_CLIENT_RETRY_ENABLED`|нет. По умолчанию: **yes** | Строка: **yes** или **no** (без учета регистра) | Позволяет включать/отключать процесс повторной отправки **gRPC**-запроса. |
|`GRPC_CLIENT_REQUEST_TIMEOUT`|нет. По умолчанию: **15_000** | Целое число в миллисекундах | Задает **timeout** **gRPC**-запроса. Будет выброшена ошибка `GrpcClientTimeoutError` |
|`GRPC_CLIENT_RETRY_TIMEOUT`|нет. | Целое число в миллисекундах | Если задано и общая длительность выполнения метода `GrpcClientService.request` превысит заданное значение, то будет выброшена ошибка `GrpcClientTimeoutError`. |
|`GRPC_CLIENT_RETRY_MAX_COUNT`|нет. По умолчанию: **5** | Целое число | Задает максимальное кол-во переотправок запроса. Если будет превышено, то будет выброшена последняя полученная ошибка. |
|`GRPC_CLIENT_RETRY_STATUS_CODES`|нет. По умолчанию: **4,14,timeout** | Через запятую указываются статусы полученных ответов | При получении ошибки со статусом из указанного списка, будет выполнен повторный **gRPC**-запрос |

## `IGrpcMetadataRequestBuilder`
Для формирования `Metadata` **gRPC**-запроса используйте сервис соответствующий интерфейсу `IGrpcMetadataRequestBuilder`.  Можно использовать `GrpcMetadataRequestBuilder` или реализовать свой. 

## `GrpcClientBuilder`
Позволяет создавать **gRPC**-клиент на основе **proto**-файлов.
Можно применять как самостоятельно (не рекомендуется), для создания нужного **gRPC**-клиента или подключить `GrpcClientModule` и использовать `GrpcClientService`.

Пример создания provide **gRPC**-клиента в модуле:

```typescript
import { join } from 'path';
import { ConfigModule, ConfigService} from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { GrpcClientBuilder } from 'src/modules/grpc/grpc-client';
import { GrpcClient } from 'protos/compiled/...';
import { GRPC_CLIENT_PROXY_DI, GRPC_CLIENT_DI } from './types/tokens';

@Module({
  imports: [ConfigModule, ...],
  providers: [
    {
      provide: GRPC_CLIENT_PROXY_DI,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ClientGrpcProxy => {
        return GrpcClientBuilder.buildClientGrpcProxy({
          url: config.get(...),
          package: 'grpc.client',
          baseDir: join(__dirname, '../protos'),
          protoPath: ['/grpc/client/GrpcClient.proto'],
        });
      },
    },
    {
      provide: GRPC_CLIENT_DI,
      inject: [GRPC_CLIENT_PROXY_DI],
      useFactory: (clientGrpcProxy: ClientGrpcProxy): GrpcClient => {
        return GrpcClientBuilder.buildClientGrpc<GrpcClient>('GrpcClient', clientGrpcProxy);
      },
    },
    ...
  ],
  exports: [GRPC_CLIENT_DI],
})
export class AppModule {}
```
`GrpcClientBuilder.buildGrpcOptions` позволяет получить `GrpcOptions` (**@see** `@nestjs/microservices`), необходимые для создания `ClientGrpcProxy`. Может быть полезно для настройки `GRPCHealthIndicator` (**@see** `@nestjs/terminus`).

## `GrpcServiceErrorFormatter` лог-форматер ошибки `ServiceError` (**@see** `@grpc/grpc-js`): `IObjectFormatter<ServiceError>`

## `GrpcClientErrorFormatter` лог-форматер ошибки `GrpcClientError`: `IObjectFormatter<GrpcClientError>`


## Метрики
| Метрика| Метки |Описание|
|---|---|---|
|`GRPC_EXTERNAL_REQUEST_DURATIONS`|**labelNames** `['service', 'method']`| Гистограмма длительностей запросов по **gRPC** к внешним системам и их количество |
|`GRPC_EXTERNAL_REQUEST_FAILED`|**labelNames** `['service', 'method', 'statusCode', 'type']`| Количество запросов по **gRPC** к внешним системам с ошибками |
|`GRPC_EXTERNAL_REQUEST_RETRY`|**labelNames** `['service', 'method', 'statusCode', 'type']`| Количество повторных запросов по **gRPC** к внешним системам |

## `GrpcClientModule`
Динамический модуль, предназначенный для создания **gRPC**-клиента.

Пример подключения:

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientModule } from 'src/modules/grpc/grpc-client';
import { MAIN_SERVICE_CLIENT_DI } from './types/tokens';

@Module({
  imports: [
    ...,
    GrpcClientModule.register({
      grpcClientProxyBuilderOptions: {
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          return {
            url: configService.get(...),
            package: 'demo.service',
            baseDir: join(__dirname, '../../../../protos'),
            protoPath: ['/demo/service/MainService.proto'],
            includeDirs: [],
          };
        },
      },
    })
  ]
})
```
### Описание опций `GrpcClientModule`

| Опция| Описание|
|---|---|
|`imports`| Подключение дополнительных модулей, если providers из них могут быть нужны для inject |
|`providers`| Включение дополнительных providers, если нужны для inject |
|`grpcClientProxyBuilderOptions`| Конструктор опций `IGrpcClientProxyBuilderOptions` для создания `ClientGrpcProxy` (**@see** `@nestjs/microservices`). Созданный `ClientGrpcProxy` будет доступен через **DI-token** `GRPC_CLIENT_PROXY_DI`|
|`metadataRequestBuilder`| Конструктор `IGrpcMetadataRequestBuilder`,  будет доступен через **DI-token** `GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI`, если не задан, то будет использован `GrpcMetadataRequestBuilder`|
|`requestOptions`| Конструктор дополнительных опций запроса, которые будут применены как по умолчанию. при вызове метода `GrpcClientService.request()` всегда можно указать новые значение, которые будут применены к текущему запросу.|
