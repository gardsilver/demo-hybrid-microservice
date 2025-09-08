# Http Common

## Описание

Основной функционал для работы с **HTTP** Request/Response.

## ВАЖНО

Для получения нормализованных заголовков `IHeaders` (**@see** `src/modules/common`) из **HTTP** Request/Response  используйте `HttHeadersHelper.normalize`.

```typescript
import { Request } from 'express';
import { HttHeadersHelper } from 'src/modules/http/http-common';

...
const ctx = context.switchToHttp();
const request = ctx.getRequest<Request>();
const headers = HttHeadersHelper.normalize(request.headers);
...

```

### `HttpGeneralAsyncContextHeaderNames`

Описаны имена **HTTP**-headers содержащие информацию основного контекста (такие как параметры сквозного логирования `IGeneralAsyncContext`: **@see** `src/modules/common`).

- `HttHeadersHelper.nameAsHeaderName` - позволяет получить имя заголовка для параметра `IGeneralAsyncContext` (**@see** `src/modules/common`)
- `HttHeadersHelper.toAsyncContext` - позволяет получить `IGeneralAsyncContext` (**@see** `src/modules/common`) из  **HTTP** заголовков `IHeaders` (**@see** `src/modules/common`).

#### ВАЖНО

Не следует на прямую использовать `HttHeadersHelper` для получения данных асинхронного контекста. Для этого нужно использовать адаптер соответствующий интерфейсу `IHttpHeadersToAsyncContextAdapter`. Можно использовать `HttpHeadersToAsyncContextAdapter` или реализовать свой.

### **Security Constants**

Описания данных **HTTP**-headers содержащие информацию об авторизации.

- `HttpAuthHelper.token` -  из `IHeaders` (**@see** `src/modules/common`) извлекает **token**-авторизации.

### Record Formatters

#### `HttpSecurityHeadersFormatter`

В логах содержимое заголовков **кук** и **авторизации** будет скрыто. Данные заголовков анализируются в полях лога с именами: `['headers', 'metadata']`.

```typescript
import { ElkLoggerConfig, ElkLoggerModule } from 'src/modules/elk-logger';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';
...

  imports: [
    ...
    ElkLoggerModule.forRoot({
      ...,
      formatters: {
        inject: [ElkLoggerConfig],
        useFactory: (config: ElkLoggerConfig) => {
          return [..., new HttpSecurityHeadersFormatter(config)];
        },
      },
    }),
  ]
...

```
