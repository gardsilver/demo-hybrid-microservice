# Kafka Client Module

## Описание

Модуль для создания `KafkaClientService` **Kafka**-клиента - пишет логи интеграции и фиксирует соответствующие метрики.
Возможна настройка параметров повторной отправки сообщения [retry](https://kafka.js.org/docs/configuration#default-retry).

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

Аналогично **Kafka Server** в `KafkaClientModule.register` можно будет указать адаптеры `serializer` и `headerBuilder` которые будут применяться при отправке запроса (при этом всегда в опциях запроса можно указать другие адаптеры).

После успешного подключения будут доступны следующие сервисы:

|**DI-токен**|**Интерфейс**|**Описание**|
|---|---|---|
|`KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI`| `IKafkaHeadersRequestBuilder`| Строит базовые заголовки на основе `IKafkaAsyncContext` для отправки сообщения |
|`KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI`| `IProducerSerializer`| Реализует кодирование данных пред отправкой |
|`KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI`| `IProducerSerializer`| Реализует кодирование данных пред отправкой |
|`KAFKA_CLIENT_PROXY_DI`| `KafkaClientProxy`| Аналог `ClientKafkaProxy` (**@see** `@nestjs/microservices`). Реализует методы отправки сообщения `send` и `sendBatch`, которые возвращают `Observable` и требуют явно подписаться на них, что бы сообщение было отправлено |
|`KafkaClientService`| `KafkaClientService`| Клиент оболочка на `ClientKafkaProxy`. Предоставляет один универсальный метод отправки отправки запроса `request`, фиксирует логи и метрики |
