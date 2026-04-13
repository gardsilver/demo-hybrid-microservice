# Http Module

## Описание

Реализован базовый функционал для создания **HTTP**-клиента или **HTTP**-сервера. Модуль разбит на три подмодуля по схеме `*-common / *-server / *-client`

- **Http Common** (`src/modules/http/http-common`) — базовый функционал для работы с **HTTP** Request/Response: нормализация заголовков, извлечение `IGeneralAsyncContext`, адаптер заголовков в асинхронный контекст, построитель заголовков, форматер логов для скрытия чувствительных заголовков. Используется и сервером, и клиентом, а также `*-common` других транспортов (gRPC, Kafka, RabbitMQ) как базовый заголовочный слой.
- **Http Server** (`src/modules/http/http-server`) — настройка **HTTP**-сервера: `HttpAuthGuard`, interceptors (`HttpLogging`, `HttpPrometheus`, `HttpHeadersResponse`), фильтр `HttpErrorResponseFilter`, декораторы параметров (`@HttpAuthInfo`, `@HttpCookies`, `@HttpGeneralAsyncContext`), builder заголовков ответа, helpers и метрики серверных запросов.
- **Http Client** (`src/modules/http/http-client`) — `HttpClientService` с логикой retry/timeout, иерархия ошибок `HttpClientExternalError` / `HttpClientInternalError` / `HttpClientTimeoutError`, форматеры `AxiosErrorFormatter` и `HttpClientErrorFormatter`, метрики внешних запросов.

### Композиция

`HttpServerModule.forRoot()` подключается глобально в `MainModule` и предоставляет интерцепторы/guard/фильтр, которые затем регистрируются как глобальные в `main.ts` либо локально через `@UseGuards` / `@UseInterceptors` / `@UseFilters`. `HttpClientModule.register()` подключается **не** глобально — отдельно для каждого целевого микросервиса. Оба модуля опираются на общий `http-common` (DI-токен `HTTP_SERVER_HEADERS_ADAPTER_DI` использует реализацию `HttpHeadersToAsyncContextAdapter` из common, builder в client наследуется от `HttpHeadersBuilder` из common).

### Параметры окружения

- `SERVICE_PORT` (по умолчанию `3000`) — порт **HTTP**-сервера.
- `CORS_OPTIONS` (по умолчанию `{"origin":"*"}`) — CORS-настройки в формате JSON.
- `HTTP_CLIENT_*` — параметры конфигурации **HTTP**-клиента (см. `src/modules/http/http-client/README.md`).
