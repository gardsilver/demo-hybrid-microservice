# Http Server Module

## Описание
Модуль для настройки **HTTP**-сервера: **Middleware**, **Guards**, **Interceptors**, **Pipes** и т.д.

## Обработка входящих запросов.

### Асинхронный контекст выполнения 
Для получения данных асинхронного контекста выполнения необходимо использовать адаптер `IHttpHeadersToAsyncContextAdapter` (**@see** `src/modules/http/http-common`).

```typescript
import { Request } from 'express';
import { Inject, ExecutionContext } from '@nestjs/common';
import { IGeneralAsyncContext, BaseHeadersHelper } from 'src/modules/common';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from 'src/modules/http/http-server';

...
  constructor(
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
    ...
  ) { ... }
...

const request = ctx.getRequest<Request>(); // ctx: ExecutionContext
const headers = BaseHeadersHelper.normalize(request.headers);
const asyncContext = this.headersAdapter.adapt(headers);

```

#### Важно
Обратите внимание на  [Request lifecycle](https://docs.nestjs.com/faq/request-lifecycle). При расширении функционала и сохранения логики сквозного логирования необходимо следить за построением `AsyncContext`. Поскольку на этапах **Middleware**, **Guards**, **Interceptors**, **Pipes** `AsyncContext` еще не создан, то во избежании не контролируемой генерации `AsyncContext` лучше созданный контекст сохранить в объекте **HTTP**-запроса и в дальнейшем проверять, есть ли сохраненный контекст:

```typescript
import {
  IGeneralAsyncContext,
} from 'src/modules/common';
import { HttpRequestHelper } from 'src/modules/http/http-server';

...
  let asyncContext: IGeneralAsyncContext = HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request);

  if (asyncContext === undefined) {
    asyncContext = this.headersAdapter.adapt(headers);
    HttpRequestHelper.setAsyncContext(asyncContext, request);
  }
...
```

Для формирования заголовков **HTTP**-ответа нужно использовать `IHttpHeadersResponseBuilder`.


```typescript
import { HTTP_HEADERS_RESPONSE_BUILDER_DI, IHttpHeadersResponseBuilder } from 'src/modules/http/http-server';

...
  constructor(
    @Inject(HTTP_HEADERS_RESPONSE_BUILDER_DI)
    private readonly headersResponseBuilder: IHttpHeadersResponseBuilder,
    ...
  ) { ... }
...

  const responseHeaders = this.headersResponseBuilder.build({
    asyncContext,
    headers: requestHeaders,
  });
```

## `HttpExceptionFormatter` лог-форматер ошибки `HttpException` (**@see** `@nestjs/common`): `IObjectFormatter<HttpException>`

## `HttpAuthGuard`
Проверка авторизации входящих **HTTP**-запросов. Можно подключать как в классе/методе, так и глобально.

Пример подключения глобально

```typescript
import { HttpAuthGuard } from 'src/modules/http/http-server';

...
  app.useGlobalGuards(
    app.get(HttpAuthGuard),
  );
...
```
Пример подключения к контроллеру
```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { HttpAuthGuard } from 'src/modules/http/http-server';

...

@UseGuards(HttpAuthGuard)
@Controller()
export class HttpController {
  
  // Или
  @UseGuards(HttpAuthGuard)
  async index(...): Promise<...> { ... }

}
...
```
При этом опция **HttpAuthGuard** в декораторе `SkipInterceptors` (**@see** `src/modules/common`) позволяет отключать `HttpAuthGuard`.


## `HttpLogging`

Интерцептор логирования **HTTP**-запросов/**HTTP**-ответов. Можно подключать как в классе/методе, так и глобально.

Пример подключения глобально

```typescript
import { HttpLogging } from 'src/modules/http/http-server';

...
  app.useGlobalInterceptors(
    app.get(HttpLogging),
  );
...
```
Пример подключения к контроллеру
```typescript
import { Controller, UseInterceptors } from '@nestjs/common';
import { HttpLogging } from 'src/modules/http/http-server';

...

@UseInterceptors(HttpLogging)
@Controller()
export class HttpController {
  
  // Или
  @UseInterceptors(HttpLogging)
  async index(...): Promise<...> { ... }

}
...
```
При этом опция **HttpLogging** в декораторе `SkipInterceptors` (**@see** `src/modules/common`) позволяет отключать `HttpLogging`.

### ВАЖНО
Если интерцептор `HttpLogging` перехватывает ошибку, то применяет `HttpResponseHandler.handleError`:  приводит ошибку к `HttpException` (**@see** `@nestjs/common`) и пишет соответствующий лог. 
Поэтому ошибка в `HttpErrorResponseFilter` попадет в преобразованном виде.


## `HttpPrometheus`
Интерцептор метрик обработки серверных **HTTP**-запросов. Можно подключать как в контроллере/методе, так и глобально.
При этом опция **HttpPrometheus** в декораторе `SkipInterceptors` (**@see** `src/modules/common`) позволяет отключать `HttpPrometheus`.


## `HttpHeadersResponse`
Интерцептор формирования заголовков в ответе **HTTP**-сервера. 
Дополняет заголовки ответа параметрами сквозного логирования. 
Можно приметь как локально, так и глобально (**see** `HttpLogging`).
При этом опция **HttpHeadersResponse** в декораторе `SkipInterceptors` (**@see** `src/modules/common`) позволяет отключать `HttpHeadersResponse`.


## `HttpErrorResponseFilter`
Перехватывает ошибки **HTTP**-сервера, приводит их к `HttpException` (**@see** `@nestjs/common`) и пишет соответствующий лог (**@see** `HttpResponseHandler.handleError`).
Можно подключать с использованием `@UseFilters` (**@see** `@nestjs/common`). 

### ВАЖНО
При использовании [Hybrid application](https://docs.nestjs.com/faq/hybrid-application) не подключать `HttpErrorResponseFilter` глобально.
Для не **Hybrid application** допускается глобальное подключение.


## Декораторы параметров  `HttpAuthInfo`, `HttpCookies` и `HttpGeneralAsyncContext`
Позволяют быстро получить данные авторизации, кук и `AsyncContext` из объекта **HTTP**-запроса.

## Метрики
| Метрика| Метки |Описание|
|---|---|---|
|`HTTP_INTERNAL_REQUEST_DURATIONS`|**labelNames** `['method', 'service', 'pathname']`| Гистограмма длительностей выполнения серверных **HTTP**-запросов и их количество |
|`HTTP_INTERNAL_REQUEST_FAILED`|**labelNames** `['method', 'service', 'pathname', 'statusCode']`| Количество серверных **HTTP**-запросов с ошибками|

