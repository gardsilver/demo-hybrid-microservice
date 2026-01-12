# Kafka Server

## Описание

Модуль для создания и настройки **Kafka**-сервера: **Middleware**, **Guards**, **Interceptors**, **Pipes** и т.д.

- Реализована логика автоматического восстановления соединения с брокером **Kafka**: [retry](https://kafka.js.org/docs/configuration#default-retry).
- Реализован `KafkaServerHealthIndicator`
- Настроено логирование и фиксирование базовых метрик.
- Добавлена поддержка одновременного подключения к нескольким независимым брокерам **Kafka**.
- Реализована возможность установки пользовательских адаптеров сообщений **Kafka** для каждого топика отдельно.
- Реализована возможность запуска **Consumer** в разных режимах: **eachMessage** и **eachBatch**.

### ВАЖНО

Данный модуль не реализует логику **Request/Response**. Вам будет доступен только функционал обработки полученного сообщения (сообщений) из указанных топиков (**@see** декоратор `EventKafkaMessage`). Для всех запущенных консъюмеров будет отключен `requestTimeout` (**@see** [eachBatchAutoResolve: true](https://kafka.js.org/docs/configuration#request-timeout)).

Если не задан `deserializer`, то в полученных данных будут десериализованы только `headers` и `key` (**@see** `IKafkaMessage` `src/modules/kafka/kafka-common`).

Данный модуль игнорирует настройки декораторами `MessagePattern` и `EventPattern`  (**@see** `@nestjs/microservices`). Для того чтобы подписаться на нужные топики используйте `EventKafkaMessage`.

## Использование

### Подключение модуля **KafkaServerModule**

- `KafkaServerModule` необходимо подключить глобально, он создаст сервисы, которые будут реагировать на общее состояние всего приложения (**@see** `src/modules/graceful-shutdown`) и на состояние активированных консъюмеров.
- `KafkaServerStatusService` будет доступен после успешного подключения `KafkaServerModule`. Позволяет получить `KafkaServerHealthIndicator` и в случае завершения приложения остановит работу всех **Consumer**.

### Подключение **Kafka**-сервера

```typescript

import { KafkaMicroserviceBuilder } from 'src/modules/kafka/kafka-server';
...

const { server, serverHealthIndicator } =  KafkaMicroserviceBuilder.setup(app, {...});
...
```

- здесь `server` это `KafkaServerService`, аналог `ServerKafka` [@nestjs/microservices](https://docs.nestjs.com/microservices/kafka#naming-conventions).

Вызов `KafkaMicroserviceBuilder.setup(...)` запускает сценарий старта **Kafka**-сервера, который происходит в два этапа:

1) Установка соединения с брокерами **Kafka**.

При этом учитывается, что в момент запуска брокеры **Kafka** могут быть кратковременно не доступны. В этом случае будут попытки переподключения на протяжении указанных `kafkaOptions.startTimeout` ms в `KafkaMicroserviceBuilder.setup` (если не указаны, то на протяжении `30_000` ms). По истечении этого периода и невозможности установки подключения будет выброшена соответствующая ошибка и остановлена работа приложения.

2) Запуск консюмеров.

Список необходимых консъюмеров определяется на основе установленных подписок на топики (**@see** декоратор `EventKafkaMessage` - описан ниже).
При этом возможны исключительные ситуации (например указанные топики отсутствуют), и если они возникают будет выброшена соответствующая ошибка и остановлена работа приложения.

При потере соединения с брокерами **Kafka** после успешного запуска **Kafka**-сервера, будут повторные попытки переподключения в рамках сценария автоматического восстановления соединения: [retry](https://kafka.js.org/docs/configuration#default-retry). В этом случае не будет остановлена работа приложения.

### Подписаться на топик

```typescript

import { Ctx, Payload } from '@nestjs/microservices';
import { ConsumerMode, EventKafkaMessage, KafkaContext, IKafkaMessage } from 'src/modules/kafka/kafka-server';
...

  @EventKafkaMessage('DemoRequest', { // Имя топика на который подписываемся или pattern ему соответствующий.
    serverName: '...', // Данный параметр должен соответствовать serverName указанному в KafkaMicroserviceBuilder.setup
    mode: ConsumerMode.EACH_MESSAGE,
    ...
  })
  async index(data: IKafkaMessage) {
    // Тут ваша логика.
  }

  @EventKafkaMessage(['request_1', 'request_2', ...], {
    serverName: '...',
    mode: ConsumerMode.EACH_BATCH,
    deserializer: new CustomDeserializer(), // CustomDeserializer implements IConsumerDeserializer<T>
    ...
  })
  async multi(@Payload() data: IKafkaMessage<T>[], @Ctx() ctx: KafkaContext) {
    // Тут ваша логика.
  }
...
```

Декоратор `EventKafkaMessage` полностью соответствует декоратору `EventPattern` (**@see** `@nestjs/microservices`) и в сочетании с ним можно дополнительно использовать стандартные декораторы `Payload` и `Ctx`, как на примере выше. Последний из них вернет объект класса `KafkaContext`, который поддерживает `eachBatch` в отличии от базового `KafkaContext` (**@see** `@nestjs/microservices`).

### Фильтрация сообщений

Если `deserializer` вернет данные с `IConsumerPacket.data === undefined`, то такое сообщение не будет обрабатываться.

Настроить `deserializer` можно очень гибко:

- Реализовать универсальный `deserializer` и подключить его через `KafkaMicroserviceBuilder.setup`.

Доступ к `serverName` и к `topic` в `deserializer` будет всегда (**@see** `options: IKafkaMessageOptions`), поэтому можно организовать выбор способа десериализации для `KafkaMessage`.

- Задать через декоратор `EventKafkaMessage`. В этом случае универсальный будет проигнорирован.
- Или воспользоваться стандартными механизмами `NodeJs` и реализовать **Middleware**, **Interceptors**, **Pipe**.

### KafkaErrorFilter

Фильтр **Kafka**-ошибок возникающих при обработке полученных сообщений. При перехвате ошибки будет записан лог. Можно подключать с использованием `@UseFilters` (**@see** `@nestjs/common`). Или глобально: используется в `HybridErrorResponseFilter` ( **@see** `src/modules/hybrid/hybrid-server`).

### Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`KAFKA_CONNECTION_STATUS`|**labelNames** `[service', 'topics', 'method', 'status']`| Количество изменений статуса соединения с **Kafka**. |
|`KAFKA_SERVER_START_FAILED`|**labelNames** `['service', 'errorType'']`| Количество ошибок подключения к **Kafka** на старте приложения. |
|`KAFKA_HANDLE_MESSAGE`|**labelNames** `['service', 'topics', 'method']`| Количество полученных сообщений **Kafka**. |
|`KAFKA_HANDLE_MESSAGE_FAILED`|**labelNames** `['service', 'topics', 'method', 'errorType']`| Количество не обработанных сообщений **Kafka** из-за возникновения ошибок. |

## Примечание

Работа `KafkaServerHealthIndicator` основана на событиях [Events](https://kafka.js.org/docs/instrumentation-events). Однако выявлено, что события не всегда срабатывают так, как ожидается. Например при потере соединения с **Kafka**-сервером событие `CRASH` может не произойти и как следствие в журналах будут фиксироваться логи о потери соединения и попытках переподключения, но статус `KafkaServerHealthIndicator` будет показывать о нормальном состоянии.

Возможное решение отказаться от модели `Events` и использовать `Kafka.admin.fetchTopicMetadata`, как `ping`-метод для проверки доступности **Kafka**-сервера.

Для того, чтобы задать принцип работы `KafkaServerHealthIndicator` имеется опция `kafkaOptions.healthIndicatorOptions` (**@see** `KafkaMicroserviceBuilder.setup`).
