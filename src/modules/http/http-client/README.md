# Http Client Module

## Описание

Модуль для настройки и создания `HttpClientService` **HTTP**-клиента (`HttpClientService`) - пишет логи интеграции и фиксирует соответствующие метрики, реализована логика обработки полученных ошибок и повторной отправки запросов.

Все ошибки, возникшие при отправки запроса будут приведены к виду:

- `HttpClientExternalException` - если возникла сетевая ошибка или ошибка на стороне внешней системы.
- `HttpClientInternalException` - если ошибка возникла в клиентском коде. Например подготовленные данные для отправки некорректны: url неподдерживаемого протокола, или данные запроса не возможно сериализовать (содержат циклические ссылки) и т.п..
- `HttpClientTimeoutError` - ответ не был получен в рамках установленных временных ограничений.

### Параметры окружения

| Параметры окружения (**env**)| Обязательный | Возможные значения | Описание|
|---|---|---|---|
|`HTTP_CLIENT_RETRY_ENABLED`|нет. По умолчанию: **yes** | Строка: **yes** или **no** (без учета регистра) | Позволяет включать/отключать процесс повторной отправки **HTTP**-запроса. |
|`HTTP_CLIENT_REQUEST_TIMEOUT`|нет. По умолчанию: **15_000** | Целое число в миллисекундах | Задает **timeout** **HTTP**-запроса. Будет выброшена ошибка `HttpClientTimeoutError` |
|`HTTP_CLIENT_RETRY_TIMEOUT`|нет. | Целое число в миллисекундах | Если задано и общая длительность выполнения метода `HttpClientService.request` превысит заданное значение, то будет выброшена ошибка `HttpClientTimeoutError`. |
|`HTTP_CLIENT_RETRY_MAX_COUNT`|нет. По умолчанию: **5** | Целое число | Задает максимальное кол-во переотправок запроса. Если будет превышено, то будет выброшена последняя полученная ошибка. |
|`HTTP_CLIENT_RETRY_STATUS_CODES`|нет. По умолчанию: **408,502,503,504,ECONNABORTED,ETIMEDOUT,ECONNREFUSED,ECONNRESET** | Через запятую указываются статусы полученных ответов | При получении ошибки со статусом из указанного списка, будет выполнен повторный **HTTP**-запрос |

## `IHttpHeadersRequestBuilder`

Для формирования заголовков **HTTP**-запроса используйте сервис соответствующий интерфейсу `IHttpHeadersRequestBuilder`.  Можно использовать `HttpHeadersRequestBuilder` или реализовать свой.

## `HttpClientService`

**HTTP**-клиент - позволяет отправлять запросы **HTTP** с записью интеграционных логов и фиксацией соответствующих метрик.
Обрабатывает `AxiosError` и приводит их к `HttpClientError` для дальнейшей обработки (**@see** `HttpClientResponseHandler`).
Ошибки **Not Found** будут восприниматься как успешный ответ и возвращаться **null**. Так же при необходимости будет осуществлять повторную отправку запроса.

## `AxiosErrorFormatter`

Лог-форматер ошибки `AxiosError` (**@see** `axios`): `IObjectFormatter<AxiosError>`

## `HttpClientErrorFormatter`

Лог-форматер ошибки `HttpClientError`: `IObjectFormatter<HttpClientError>`

## Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`HTTP_EXTERNAL_REQUEST_DURATIONS`|**labelNames** `['method', 'hostname', 'pathname']`| Гистограмма длительностей запросов по **HTTP** к внешним системам и их количество |
|`HTTP_EXTERNAL_REQUEST_FAILED`|**labelNames** `['method', 'hostname', 'pathname', 'statusCode', 'type']`| Количество запросов по **HTTP** к внешним системам с ошибками|
|`HTTP_EXTERNAL_REQUEST_RETRY`|**labelNames** `['method', 'hostname', 'pathname', 'statusCode', 'type']`| Количество повторных запросов по **HTTP** к внешним системам|

## `HttpClientModule`

Динамический модуль, предназначенный для создания **HTTP**-клиентов соответствующие одному микросервису.

Пример подключения:

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientModule } from 'src/modules/http/http-client';

@Module({
  imports: [
    ...,
    HttpClientModule.register({
      httpModuleOptions: {
        options: {
          inject: [ConfigService],
          useFactory: (config: ConfigService) {
            baseURL: config.get(...),
            timeout: 5_000,
          }
        },
      },
      requestOptions: {
        retryOptions: {
          useValue: {
            timeout: 20_000,
            delay: 5_000,
          }
        }
      }
    }),
  ]
})
```

### Описание опций `HttpClientModule`

| Опция| Описание|
|---|---|
|`imports`| Подключение дополнительных модулей, если providers из них могут быть нужны для inject |
|`providers`| Включение дополнительных providers, если нужны для inject |
|`headersRequestBuilder`| Конструктор `IHttpHeadersRequestBuilder`,  будет доступен через **DI-token** `HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI`, если не задан, то будет использован `HttpHeadersRequestBuilder`|
|`httpModuleOptions`| Параметры конфигурации `HttpModule` (**@see** `@nestjs/axios`) |
|`requestOptions`| Конструктор дополнительных опций запроса, которые будут применены как по умолчанию. при вызове метода `HttpClientService.request()` всегда можно указать новые значение, которые будут применены к текущему запросу.|
