# Http Server Module

## Описание

Модуль настройки **HTTP**-сервера: `HttpAuthGuard`, interceptors, filter, декораторы параметров и builder заголовков ответа.

## Подключение

`HttpServerModule.forRoot()` регистрируется как **global** и подключается в `MainModule`. Поддерживает замену реализаций `IHttpHeadersToAsyncContextAdapter` (токен `HTTP_SERVER_HEADERS_ADAPTER_DI`) и `IHttpHeadersResponseBuilder` (токен `HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI`) через опции `headersToAsyncContextAdapter` / `headersResponseBuilder`.

```ts
import { HttpServerModule } from 'src/modules/http/http-server';

@Module({
  imports: [
    HttpServerModule.forRoot(),
  ],
})
export class MainModule {}
```

### Опции `HttpServerModule.forRoot(options)` — `IHttpServerModuleOptions`

Все поля опциональны. Если `options` не передан — подключаются реализации по умолчанию.

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` (`ModuleMetadata['imports']`) | Нет | `[]` | Дополнительные модули, добавляемые к базовому списку (`ConfigModule`, `ElkLoggerModule`, `AuthModule`, `PrometheusModule`). Используются, если в фабриках нужен inject из сторонних модулей. |
| `providers` | `Provider[]` (`@nestjs/common`) | Нет | `[]` | Дополнительные provider-ы, добавляемые к встроенному набору (`HttpResponseHandler`, guards, interceptors, filter, адаптеры). |
| `headersToAsyncContextAdapter` | `IServiceClassProvider<IHttpHeadersToAsyncContextAdapter>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `{ useClass: HttpHeadersToAsyncContextAdapter }` | Кастомная реализация адаптера `IHttpHeadersToAsyncContextAdapter`, привязываемого к токену `HTTP_SERVER_HEADERS_ADAPTER_DI`. Выбор между `useClass` / `useValue` / `useFactory` выполняется `ProviderBuilder.build`. |
| `headersToAsyncContextAdapter.useClass` | `Type<IHttpHeadersToAsyncContextAdapter>` | — | `HttpHeadersToAsyncContextAdapter` | Класс реализации, если выбран вариант `useClass`. |
| `headersToAsyncContextAdapter.useValue` | `IHttpHeadersToAsyncContextAdapter` | — | — | Готовый экземпляр для варианта `useValue`. |
| `headersToAsyncContextAdapter.useFactory` | `(...deps) => IHttpHeadersToAsyncContextAdapter \| Promise<...>` | — | — | Фабрика для варианта `useFactory`. Вместе с `inject` из `IServiceFactoryProvider`. |
| `headersToAsyncContextAdapter.inject` | `FactoryProvider['inject']` | Нет | `[]` | Зависимости фабрики (для `useFactory`). |
| `headersResponseBuilder` | `IServiceClassProvider<IHttpHeadersResponseBuilder>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `{ useClass: HttpHeadersResponseBuilder }` | Кастомная реализация билдера заголовков ответа, привязываемого к токену `HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI`. |
| `headersResponseBuilder.useClass` | `Type<IHttpHeadersResponseBuilder>` | — | `HttpHeadersResponseBuilder` | Класс реализации для варианта `useClass`. |
| `headersResponseBuilder.useValue` | `IHttpHeadersResponseBuilder` | — | — | Готовый экземпляр для варианта `useValue`. |
| `headersResponseBuilder.useFactory` | `(...deps) => IHttpHeadersResponseBuilder \| Promise<...>` | — | — | Фабрика для варианта `useFactory`. |
| `headersResponseBuilder.inject` | `FactoryProvider['inject']` | Нет | `[]` | Зависимости фабрики. |

Модуль экспортирует:

- `HTTP_SERVER_HEADERS_ADAPTER_DI`, `HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI`
- `HttpAuthGuard`, `HttpLogging`, `HttpPrometheus`, `HttpHeadersResponse`, `HttpErrorResponseFilter`

Регистрация как глобальных в `main.ts`:

```ts
import { HttpAuthGuard, HttpLogging, HttpPrometheus, HttpHeadersResponse } from 'src/modules/http/http-server';

app.useGlobalGuards(app.get(HttpAuthGuard));
app.useGlobalInterceptors(
  app.get(HttpLogging),
  app.get(HttpPrometheus),
  app.get(HttpHeadersResponse),
);
```

## Обработка входящих запросов

### Асинхронный контекст выполнения

Для получения данных асинхронного контекста выполнения используется адаптер `IHttpHeadersToAsyncContextAdapter` (**@see** `src/modules/http/http-common`), который инжектируется по DI-токену `HTTP_SERVER_HEADERS_ADAPTER_DI`.

```ts
import { Request } from 'express';
import { Inject, ExecutionContext } from '@nestjs/common';
import { BaseHeadersHelper } from 'src/modules/common';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from 'src/modules/http/http-server';

constructor(
  @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
  private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
) {}

const request = ctx.getRequest<Request>();
const headers = BaseHeadersHelper.normalize(request.headers);
const asyncContext = this.headersAdapter.adapt(headers);
```

#### Важно

Обратите внимание на [Request lifecycle](https://docs.nestjs.com/faq/request-lifecycle). На этапах **Middleware**, **Guards**, **Interceptors**, **Pipes** `AsyncContext` ещё не создан. Чтобы избежать неконтролируемой генерации контекста, созданный `IGeneralAsyncContext` сохраняется в объекте **HTTP**-запроса через `HttpRequestHelper.setAsyncContext`, а на последующих этапах проверяется через `HttpRequestHelper.getAsyncContext`.

```ts
import { IGeneralAsyncContext } from 'src/modules/common';
import { HttpRequestHelper } from 'src/modules/http/http-server';

let asyncContext: IGeneralAsyncContext = HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request);

if (asyncContext === undefined) {
  asyncContext = this.headersAdapter.adapt(headers);
  HttpRequestHelper.setAsyncContext(asyncContext, request);
}
```

`HttpRequestHelper` также хранит `IAuthInfo` запроса (`setAuthInfo` / `getAuthInfo`) — используется `HttpAuthGuard` и декоратором `@HttpAuthInfo`.

### Формирование заголовков ответа

Для формирования заголовков **HTTP**-ответа используйте `IHttpHeadersResponseBuilder` (DI-токен `HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI`). Реализация по умолчанию — `HttpHeadersResponseBuilder`, наследуется от `HttpHeadersBuilder` из `http-common`.

```ts
import { HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI, IHttpHeadersResponseBuilder } from 'src/modules/http/http-server';

constructor(
  @Inject(HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI)
  private readonly headersResponseBuilder: IHttpHeadersResponseBuilder,
) {}

const responseHeaders = this.headersResponseBuilder.build({
  asyncContext,
  headers: requestHeaders,
});
```

## `HttpExceptionFormatter`

Лог-форматер `IObjectFormatter<HttpException>` для ошибки `HttpException` (**@see** `@nestjs/common`).

## `HttpAuthGuard`

Проверка авторизации входящих **HTTP**-запросов. Инжектит `IAuthService` (`AUTH_SERVICE_DI`), извлекает `Bearer`-токен через `HttpAuthHelper.token`, сохраняет `IAuthInfo` в запрос через `HttpRequestHelper.setAuthInfo`. Возвращает `true`, если `auth.status === AuthStatus.SUCCESS`.

Можно подключать глобально либо локально через `@UseGuards`.

```ts
import { HttpAuthGuard } from 'src/modules/http/http-server';

app.useGlobalGuards(app.get(HttpAuthGuard));
```

```ts
import { Controller, UseGuards } from '@nestjs/common';
import { HttpAuthGuard } from 'src/modules/http/http-server';

@UseGuards(HttpAuthGuard)
@Controller()
export class HttpController {
  @UseGuards(HttpAuthGuard)
  async index() {}
}
```

Опции `All` или `HttpAuthGuard` в декораторе `@SkipInterceptors` (**@see** `src/modules/common`) позволяют отключить `HttpAuthGuard` для контроллера/метода (при этом guard всё равно выполнит аутентификацию и заполнит `IAuthInfo`, но всегда вернёт `true`).

## `HttpLogging`

Интерцептор логирования **HTTP**-запросов/ответов. Подключается глобально или через `@UseInterceptors`.

```ts
app.useGlobalInterceptors(app.get(HttpLogging));
```

Опция `HttpLogging` в `@SkipInterceptors` позволяет отключить интерцептор.

### ВАЖНО

Если `HttpLogging` перехватывает ошибку, он применяет `HttpResponseHandler.handleError`: приводит её к `HttpException` и пишет соответствующий лог. Поэтому в `HttpErrorResponseFilter` ошибка попадёт уже в преобразованном виде.

## `HttpPrometheus`

Интерцептор метрик обработки серверных **HTTP**-запросов. Подключается глобально либо локально. Опция `HttpPrometheus` в `@SkipInterceptors` отключает интерцептор.

## `HttpHeadersResponse`

Интерцептор формирования заголовков **HTTP**-ответа — дополняет ответ параметрами сквозного логирования из `IGeneralAsyncContext` через `IHttpHeadersResponseBuilder`. Подключается глобально либо локально. Опция `HttpHeadersResponse` в `@SkipInterceptors` отключает интерцептор.

## `HttpErrorResponseFilter`

Перехватывает ошибки **HTTP**-сервера, приводит их к `HttpException` и пишет соответствующий лог (**@see** `HttpResponseHandler.handleError`). Подключается через `@UseFilters`.

### ВАЖНО

При использовании [Hybrid application](https://docs.nestjs.com/faq/hybrid-application) **не** подключать `HttpErrorResponseFilter` глобально — вместо этого используется `HybridErrorResponseFilter` из `hybrid-server`, который делегирует обработку транспортному фильтру. Для чисто **HTTP**-приложения допускается глобальное подключение.

## Декораторы параметров

- `@HttpAuthInfo()` — возвращает `IAuthInfo` запроса (записанный `HttpAuthGuard` в `HttpRequestHelper.setAuthInfo`). Аргументов не принимает.

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| — | — | — | Декоратор не принимает аргументов. |
| **возвращает** | `IAuthInfo` | — | Данные авторизации, извлечённые из `express.Request` через `HttpRequestHelper.getAuthInfo`. |

- `@HttpCookies(name?)` — возвращает разобранные куки (через `cookie.parse`) целиком или значение конкретной куки по имени.

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `name` | `string` | Нет | Имя куки. Если указано — возвращается строковое значение куки или `undefined`; если опущено — возвращается объект со всеми куками. |
| **возвращает** | `Record<string, string> \| string \| undefined` | — | Разобранные куки из заголовка `cookie` запроса. |

- `@HttpGeneralAsyncContext()` — возвращает сохранённый в запросе `IGeneralAsyncContext`. Аргументов не принимает.

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| — | — | — | Декоратор не принимает аргументов. |
| **возвращает** | `IGeneralAsyncContext` | — | Асинхронный контекст запроса, извлечённый через `HttpRequestHelper.getAsyncContext`. |

```ts
import { Controller, Get } from '@nestjs/common';
import { IAuthInfo } from 'src/modules/auth';
import { IGeneralAsyncContext } from 'src/modules/common';
import { HttpAuthInfo, HttpCookies, HttpGeneralAsyncContext } from 'src/modules/http/http-server';

@Controller('/api')
export class HttpController {
  @Get('/profile')
  async profile(
    @HttpAuthInfo() auth: IAuthInfo,
    @HttpCookies('session') session: string | undefined,
    @HttpGeneralAsyncContext() asyncContext: IGeneralAsyncContext,
  ) {
    return { userId: auth.userId, traceId: asyncContext.traceId, session };
  }
}
```

## Параметры окружения

- `SERVICE_PORT` (по умолчанию `3000`) — порт **HTTP**-сервера.
- `CORS_OPTIONS` (по умолчанию `{"origin":"*"}`) — CORS-настройки в формате JSON.

## Метрики

| Метрика | Метки | Описание |
|---|---|---|
| `HTTP_INTERNAL_REQUEST_DURATIONS` | `['method', 'service', 'pathname']` | Гистограмма длительностей выполнения серверных **HTTP**-запросов и их количество |
| `HTTP_INTERNAL_REQUEST_FAILED` | `['method', 'service', 'pathname', 'statusCode']` | Количество серверных **HTTP**-запросов с ошибками |
