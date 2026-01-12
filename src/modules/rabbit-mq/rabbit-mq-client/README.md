# RabbitMq Client

## Описание

Модуль для создания `RabbitMqClientService` **RabbitMq**-клиента - пишет логи интеграции и фиксирует соответствующие метрики, реализована логика обработки полученных ошибок.

Все ошибки, возникшие при отправке запроса будут приведены к виду:

- `RabbitMqClientExternalError` - если возникла сетевая ошибка или ошибка на стороне внешней системы.
- `RabbitMqClientInternalError` - если ошибка возникла в клиентском коде. Например подготовленные данные для отправки некорректны.
- `RabbitMqClientTimeoutError` - запрос не был отправлен в рамках установленных временных ограничений.

## Подключение

Для создания `RabbitMqClientService` не обходимо подключить модуль `RabbitMqClientModule`.

```typescript
import { RabbitMqClientModule } from 'src/modules/rabbit-mq/rabbit-mq-client';
@Module({
  imports: [
    ...
    RabbitMqClientModule.register(...),
  ]
})
....
```

Аналогично **RabbitMq Server** в `RabbitMqClientModule.register` можно будет указать универсальные адаптеры `serializer` и `publishOptionsBuilder`, которые будут применяться при отправке запроса (при этом всегда в опциях запроса можно указать другие адаптеры).

После успешного подключения будут доступны следующие сервисы:

|**DI-токен**|**Интерфейс**|**Описание**|
|---|---|---|
|`RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI`| `IRabbitMqPublishOptionsBuilder` (**@see** `src/modules/rabbit-mq/rabbit-mq-common`) | Строит параметры отправки на основе `IRabbitMqAsyncContext` для отправки сообщения |
|`RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI`| `IProducerSerializer`| Реализует кодирование данных пред отправкой |
|`RABBIT_MQ_CLIENT_PROXY_DI`| `RabbitMqClientProxy`| Аналог `ClientRMQ` (**@see** `@nestjs/microservices`). Реализует метод отправки сообщения `send` позволяющий оправить сообщение с использованием `publish` или `sendToQueue`, который возвращают `Observable` и требуют явно подписаться на него, что бы сообщение было отправлено |
|`RabbitMqClientService`| `RabbitMqClientService`| Клиент оболочка на `RabbitMqClientProxy`. Предоставляет один универсальный метод отправки отправки запроса `request`, фиксирует логи и метрики |
|`RabbitMqClientErrorHandler`| `RabbitMqClientErrorHandler`| Обработчик ошибок, пишет соответствующие логи |


## `IProducerSerializer`

Кодирует данные для отправки **RabbitMq**-запроса. По умолчанию используется `ProducerSerializer`: массивы сериализует в `json`-строку, объекты приводит к строке (`obj.toString()`).

## `RabbitMqClientErrorHandler`

Обработчик ошибок: приводит ошибки к `RabbitMqClientError` и пишет соответствующий лог.

## `RabbitMqClientErrorObjectFormatter`

Лог-форматер ошибки `RabbitMqClientError`: `IObjectFormatter<RabbitMqClientError>`

## Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`RABBIT_MQ_EXTERNAL_REQUEST_DURATIONS`|**labelNames** `['service', 'queue', 'exchange', 'routing']`| Гистограмма длительностей отправки запросов **RabbitMq** и их количество. |
|`RABBIT_MQ_EXTERNAL_REQUEST_FAILED`|**labelNames** `['service', 'queue', 'exchange', 'routing', 'statusCode', 'type']`| Количество ошибок при попытке отправить **RabbitMq**-запрос |
