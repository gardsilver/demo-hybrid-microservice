# Kafka Server

## Описание

Модуль для создания и настройки **Kafka**-сервера: **Middleware**, **Guards**, **Interceptors**, **Pipes** и т.д.

- Реализована логика автоматического восстановления соединения с брокером **Kafka**.
- Реализован `KafkaServerHealthIndicator`
- Настроено логирование
- Добавления поддержка одновременно подключения к нескольким независимым брокерам **Kafka**
- Реализована возможность установки пользовательских адаптеров сообщений **Kafka** для каждого топика отдельно.
- Реализована возможность запуска **Consumer** в разных режимах: **eachMessage** и **eachBatch**.

## ВАЖНО

Данный модуль не реализует логику **Request-Response**. Вам будет доступен только функционал обработки полученного сообщения(сообщений) из указанных топиков (**@see** декоратор `EventKafkaMessage`).

Если не задан `deserializer`, то в полученных данных будут десериализованы только `headers` и `key` (**@see** `IKafkaMessage` `src/modules/kafka/kafka-common`).

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

- `server` сервис `KafkaServerService`, аналог `ServerKafka` [@nestjs/microservices](https://docs.nestjs.com/microservices/kafka#naming-conventions).

### Подписаться на топик

```typescript

import { Ctx, Payload } from '@nestjs/microservices';
import { ConsumerMode, EventKafkaMessage, KafkaContext, KafkaRequest } from 'src/modules/kafka/kafka-server';
...

  @EventKafkaMessage('DemoRequest', { // Имя топика на который подписываемся или pattern ему соответствующий.
    serverName: '...', // Данный параметр должен соответствовать serverName указанному в KafkaMicroserviceBuilder.setup
    mode: ConsumerMode.EACH_MESSAGE,
    ...
  })
  async index(data: KafkaRequest) {
    // Тут ваша логика.
  }

  @EventKafkaMessage(['request_1', 'request_2', ...], {
    serverName: '...',
    mode: ConsumerMode.EACH_BATCH,
    deserializer: new CustomDeserializer(), // CustomDeserializer implements IConsumerRequestDeserializer<T>
    ...
  })
  async multi(@Payload() data: KafkaRequest<T>[], @Ctx() ctx: KafkaContext) {
    // Тут ваша логика.
  }
...
```

Декоратор `EventKafkaMessage` полностью соответствует декоратору `EventPattern` (**@see** `@nestjs/microservices`) и в сочетании с ним можно дополнительно использовать стандартные декораторы `Payload` и `Ctx`. Последний из них вернет объект класса `KafkaContext`, который поддерживает `eachBatch` в отличии от базового `KafkaContext` (**@see** `@nestjs/microservices`).

### Фильтрация сообщений

Если `deserializer` вернет данные с `KafkaRequest.data === undefined`, то такое сообщение не будет обрабатываться.

Настроить `deserializer` можно очень гибко:

- Реализовать универсальный `deserializer` и подключить его глобально через `KafkaMicroserviceBuilder.setup`.

Доступ к `serverName` и `topic` в `deserializer` будет всегда (**@see** `options: IKafkaMessageOptions`), поэтому можно организовать выбор способа десериализации для `KafkaMessage`.

- Задать через декоратор `EventKafkaMessage`. В этом случае глобальный будет проигнорирован.
- Или воспользоваться стандартными механизмами `NodeJs` и реализовать **Middleware** или **Pipe**. Например через `KafkaContext.getMessageOptions` можно получить `serverName`.

### Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`KAFKA_CONNECTION_STATUS`|**labelNames** `['service', 'status']`| Количество изменений статуса соединения с **Kafka**. |
|`KAFKA_HANDLE_MESSAGE_SUCCESS`|**labelNames** `['service', 'topics', 'method']`| Количество успешно обработанных сообщений **Kafka**. |
|`KAFKA_HANDLE_MESSAGE_FAILED`|**labelNames** `['service', 'topics', 'method', 'errorType']`| Количество ошибок при обработке сообщений **Kafka**. |
