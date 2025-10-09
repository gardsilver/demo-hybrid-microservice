# Kafka Client Module

## Описание

Модуль для создания `KafkaClientService` **Kafka**-клиента - пишет логи интеграции и фиксирует соответствующие метрики, реализована логика обработки полученных ошибок.

Все ошибки, возникшие при отправке запроса будут приведены к виду:

- `KafkaClientExternalError` - если возникла сетевая ошибка или ошибка на стороне внешней системы.
- `KafkaClientInternalError` - если ошибка возникла в клиентском коде. Например подготовленные данные для отправки некорректны.
- `KafkaClientTimeoutError` - запрос не был отправлен в рамках установленных временных ограничений.

## Подключение

Для создания `KafkaClientService` не обходимо подключить модуль `KafkaClientModule`.

```typescript
import { KafkaClientModule } from 'src/modules/kafka/kafka-client';
@Module({
  imports: [
    ...
    KafkaClientModule.register(...),
  ]
})
....
```

Аналогично **Kafka Server** в `KafkaClientModule.register` можно будет указать универсальные адаптеры `serializer` и `headerBuilder`, которые будут применяться при отправке запроса (при этом всегда в опциях запроса можно указать другие адаптеры).

После успешного подключения будут доступны следующие сервисы:

|**DI-токен**|**Интерфейс**|**Описание**|
|---|---|---|
|`KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI`| `IKafkaHeadersRequestBuilder`| Строит базовые заголовки на основе `IKafkaAsyncContext` для отправки сообщения |
|`KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI`| `IProducerSerializer`| Реализует кодирование данных пред отправкой |
|`KAFKA_CLIENT_PROXY_DI`| `KafkaClientProxy`| Аналог `ClientKafkaProxy` (**@see** `@nestjs/microservices`). Реализует методы отправки сообщения `send` и `sendBatch`, которые возвращают `Observable` и требуют явно подписаться на них, что бы сообщение было отправлено |
|`KafkaClientService`| `KafkaClientService`| Клиент оболочка на `ClientKafkaProxy`. Предоставляет один универсальный метод отправки отправки запроса `request`, фиксирует логи и метрики |
|`KafkaClientErrorHandler`| `KafkaClientErrorHandler`| Обработчик ошибок, пишет соответствующие логи |

## `IKafkaHeadersRequestBuilder`

Для формирования `IHeaders` **Kafka**-запроса используйте сервис соответствующий интерфейсу `IKafkaHeadersRequestBuilder`.  Можно использовать `KafkaHeadersRequestBuilder` или реализовать свой.

## `IProducerSerializer`

Кодирует данные для отправки **Kafka**-запроса. По умолчанию используется `ProducerSerializer`: массивы сериализует в `json`-строку, объекты приводит к строке (`obj.toString()`).

## `KafkaClientErrorHandler`

Обработчик ошибок: приводит ошибки к `KafkaClientError` и пишет соответствующий лог.

## `KafkaClientErrorObjectFormatter`

Лог-форматер ошибки `KafkaClientError`: `IObjectFormatter<ServiceError>`

## Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`KAFKA_EXTERNAL_REQUEST_DURATIONS`|**labelNames** `['service', 'topics', 'method']`| Гистограмма длительностей отправки **Kafka**-запросов и их количество |
|`KAFKA_EXTERNAL_REQUEST_FAILED`|**labelNames** `['service', 'topics', 'method', 'statusCode', 'type']`| Количество ошибок при попытке отправить **Kafka**-запрос |
