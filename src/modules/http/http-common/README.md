# Http Common

## Описание

Основной функционал для работы с **HTTP** Request/Response, общий для `http-server` и `http-client`. Также используется `*-common` модулями других транспортов (gRPC, Kafka, RabbitMQ) как базовый заголовочный слой.

Экспортирует:

- `HttHeadersHelper`, `HttpAuthHelper` — хелперы работы с заголовками.
- `HttpHeadersToAsyncContextAdapter` — адаптер `IHttpHeadersToAsyncContextAdapter`.
- `HttpHeadersBuilder` — базовый построитель заголовков (`IHttpHeadersBuilder`), переиспользуется сервером (`HttpHeadersResponseBuilder`) и клиентом (`HttpHeadersRequestBuilder`).
- `HttpSecurityHeadersFormatter` — лог-форматер `ILogRecordFormatter`.
- Константы `COOKIE_HEADER_NAME`, `AUTHORIZATION_HEADER_NAME`, `BEARER_NAME`.
- `enum HttpGeneralAsyncContextHeaderNames` — имена заголовков сквозного логирования.

## `HttHeadersHelper`

Для получения нормализованных заголовков `IHeaders` (**@see** `src/modules/common`) из **HTTP** Request/Response используйте `HttHeadersHelper.normalize`.

```ts
import { Request } from 'express';
import { HttHeadersHelper } from 'src/modules/http/http-common';

const ctx = context.switchToHttp();
const request = ctx.getRequest<Request>();
const headers = HttHeadersHelper.normalize(request.headers);
```

Дополнительно:

- `HttHeadersHelper.nameAsHeaderName(name, useZipkin?)` — возвращает имя **HTTP**-заголовка для поля `IGeneralAsyncContext` (`traceId`, `spanId`, `correlationId`, `requestId`). При `useZipkin = true` используются B3-заголовки.
- `HttHeadersHelper.toAsyncContext<Ctx>(headers)` — собирает `IGeneralAsyncContext` из **HTTP**-заголовков: читает `x-trace-id` / `x-b3-trace-id`, `x-span-id` / `x-b3-span-id`, `x-correlation-id`, `x-request-id`. `spanId` всегда генерируется новым (`TraceSpanHelper.generateRandomValue()`), входящий становится `parentSpanId`/`initialSpanId`.

### ВАЖНО

Не следует напрямую использовать `HttHeadersHelper` для получения данных асинхронного контекста. Для этого используется адаптер, соответствующий интерфейсу `IHttpHeadersToAsyncContextAdapter`. Можно использовать `HttpHeadersToAsyncContextAdapter` или реализовать свой.

### `HttpGeneralAsyncContextHeaderNames`

Описаны имена **HTTP**-заголовков, содержащих параметры сквозного логирования `IGeneralAsyncContext` (**@see** `src/modules/common`):

| Поле | Заголовок | Zipkin-вариант |
|---|---|---|
| `traceId` | `x-trace-id` | `x-b3-trace-id` |
| `spanId` | `x-span-id` | `x-b3-span-id` |
| `correlationId` | `x-correlation-id` | — |
| `requestId` | `x-request-id` | — |

## `HttpHeadersBuilder`

Реализация `IHttpHeadersBuilder`. По заданному `IGeneralAsyncContext` и исходным заголовкам формирует итоговый `IHeaders`, удаляя `authorization` и дубли trace/span-заголовков. Поддерживает опции `useZipkin` и `asArray`. На его основе построены `HttpHeadersResponseBuilder` (server) и `HttpHeadersRequestBuilder` (client).

## `HttpAuthHelper`

Описания констант **HTTP**-заголовков, содержащих данные авторизации.

- `HttpAuthHelper.token(headers)` — извлекает **Bearer**-токен из `IHeaders` (строка после `Bearer `), либо `undefined`.

## Record Formatters

### `HttpSecurityHeadersFormatter`

Лог-форматер `ILogRecordFormatter` с `priority = 0`. В логах содержимое заголовков **кук** (`cookie`) и **авторизации** (`authorization`) заменяется на ` ***** `. Данные анализируются в полях лога `headers` и `metadata`.

```ts
import { ElkLoggerConfig, ElkLoggerModule } from 'src/modules/elk-logger';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';

imports: [
  ElkLoggerModule.forRoot({
    formatters: {
      inject: [ElkLoggerConfig],
      useFactory: (config: ElkLoggerConfig) => {
        return [new HttpSecurityHeadersFormatter(config)];
      },
    },
  }),
];
```
