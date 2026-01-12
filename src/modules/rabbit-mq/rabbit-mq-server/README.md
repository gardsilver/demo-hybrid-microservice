# RabbitMq Server

## Описание

Модуль для создания и настройки **RabbitMq**-сервера: **Middleware**, **Guards**, **Interceptors**, **Pipes** и т.д.

- Реализована логика автоматического восстановления соединения с брокером **RabbitMq**.
- Реализован `RabbitMqHealthIndicator`
- Настроено логирование и фиксирование базовых метрик.
- Добавлена поддержка одновременного подключения к нескольким независимым брокерам **RabbitMq**.
- Реализована возможность установки пользовательских адаптеров сообщений **RabbitMq** для каждого консъюмера.

### ВАЖНО

Данный модуль не реализует логику **Request/Response**. Вам будет доступен только функционал обработки полученного сообщения (сообщений) для каждого консъюмера (**@see** декоратор `EventRabbitMqMessage`).

Если не задан `deserializer`, то в полученных данных будут нормализованы только `headers` (**@see** `RabbitMqMessageOptionsHelper` `src/modules/rabbit-mq/rabbit-mq-common`).

Данный модуль игнорирует настройки декораторами `MessagePattern` и `EventPattern`  (**@see** `@nestjs/microservices`). Для настройки консъюмеров используйте `EventRabbitMqMessage`.

## Использование

### Подключение модуля **RabbitMqServerModule**

- `RabbitMqServerModule` необходимо подключить глобально, он создаст сервисы, которые будут реагировать на общее состояние всего приложения (**@see** `src/modules/graceful-shutdown`) и на состояние подключенных консъюмеров.
- `RabbitMqServerStatusService` будет доступен после успешного подключения `RabbitMqServerModule`. Позволяет получить `RabbitMqHealthIndicator` и в случае завершения приложения остановит работу всех **Consumer**.

### Подключение **RabbitMq**-сервера

```typescript

import { RabbitMqMicroserviceBuilder } from 'src/modules/rabbit-mq/rabbit-mq-server';
...

const { server, serverHealthIndicator } =  RabbitMqMicroserviceBuilder.setup(app, {...});
...
```

- здесь `server` это `RabbitMqServer`, аналог `ServerRMQ` [@nestjs/microservices](https://docs.nestjs.com/microservices/rabbitmq).

#### Основные параметры `RabbitMqMicroserviceBuilder.setup(...)`

| Параметр `IRabbitMqMicroserviceBuilderOptions` | Описание | Примеры |
|-|-|-|
|`serverName`| Имя **RabbitMq**-сервера, используется как идентификатор для настройки консъюмеров, и он же будет отображать состояние данного сервера в  `RabbitMqHealthIndicator` |  |
|`urls`| Список URL-адресов для повторных попыток подключения к **RabbitMq**-серверу |  |
|`consumer`| Опции настройки подключения к **RabbitMq**-серверу и настройки консъюмеров по умолчанию. <br>  - `socketOptions.connectionOptions` опции подключения к **RabbitMq**-серверу <br>  - `socketOptions.heartbeatIntervalInSeconds` heartbeat в сек. <br>  - `socketOptions.reconnectTimeInSeconds` пауза в сек. между повторными попытками подключения <br>  - `maxConnectionAttempts` определяет максимальное количество повторных подключений. При достижении указанного значения будет выброшена соответствующая ошибка, а процесс повторных подключений остановлен. Значение `-1` (по умолчанию) отключает контроль количества повторных подключений. <br>  - `queueOptions` опции настройки очередей, которые будут использоваться по умолчанию. <br>  - `exchangeArguments` аргументы `exchange`, которые будут использоваться по умолчанию |  |

### Настройки консъюмеров

Для создания консъюмера необходимо использовать декоратор `EventRabbitMqMessage`:

```typescript

import { Ctx, Payload } from '@nestjs/microservices';
import { IRabbitMqConsumeMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { EventRabbitMqMessage, RabbitMqContext } from 'src/modules/rabbit-mq/rabbit-mq-server';
...

  @EventRabbitMqMessage('request', { // идентификатор консъюмера.
    serverName: '...', // Данный параметр должен соответствовать serverName указанному в RabbitMqMicroserviceBuilder.setup
    ...
  })
  async handleMessages(@Payload() data: IRabbitMqConsumeMessage, @Ctx() ctx: RabbitMqContext) {
    // Тут ваша логика.
  }

...
```

`RabbitMqContext` предоставляет доступ к:

- `getMessageRef()` полученное сообщение (необходимо использовать в пользовательском вызове `ack`/`nack`).
- `getMessage()` декодированное сообщение.
- `getChannelRef()` экземпляр `Channel` (**@see**  `amqp-connection-manager`).
- `messageOptions()` опции `IRabbitMqEventOptions`, в которых будут данные `serverName`, идентификатор консъюмера (`pattern`) и используемой очереди (`queue`).

Декоратор `EventRabbitMqMessage` полностью соответствует декоратору `EventPattern` (**@see** `@nestjs/microservices`) и в сочетании с ним можно дополнительно использовать стандартные декораторы `Payload` и `Ctx`, как на примере выше.

### Фильтрация сообщений

Если `deserializer` вернет данные с `IConsumerPacket.data === undefined`, то такое сообщение не будет обрабатываться.

Настроить `deserializer` можно очень гибко:

- Реализовать универсальный `deserializer` и подключить его через `RabbitMqMicroserviceBuilder.setup`.

Доступ к `serverName` и `pattern` (идентификатор консъюмера) в `deserializer` будет всегда (**@see** `options: IRabbitMqEventOptions`), поэтому можно организовать выбор способа десериализации для `ConsumeMessage` (**@see** `amqplib`).

- Задать через декоратор `EventRabbitMqMessage`. В этом случае универсальный будет проигнорирован.
- Или воспользоваться стандартными механизмами `NodeJs` и реализовать **Middleware**, **Interceptors**, **Pipe**.

### RabbitMqErrorFilter

Фильтр ошибок возникающих при обработке полученных сообщений. При перехвате ошибки будет записан лог. Можно подключать с использованием `@UseFilters` (**@see** `@nestjs/common`). Или глобально: используется в `HybridErrorResponseFilter` ( **@see** `src/modules/hybrid/hybrid-server`).

### Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`RABBIT_MQ_SERVER_CONNECTION_STATUS`|**labelNames** `['service', 'status']`| Количество изменений статуса соединения с **RabbitMq**-сервером. |
|`RABBIT_MQ_SERVER_CONNECTION_FAILED`|**labelNames** `['service', 'errorType']`| Количество ошибок подключения к **RabbitMq**-серверу. |
|`RABBIT_MQ_HANDLE_MESSAGE`|**labelNames** `['service', 'queue', 'exchange', 'routing']`| Количество полученных сообщений от **RabbitMq**-сервера. |
|`RABBIT_MQ_HANDLE_MESSAGE_FAILED`|**labelNames** `['service', 'queue', 'exchange', 'routing', 'errorType']`| Количество не обработанных сообщений **RabbitMq**-сервера из-за возникновения ошибок. |
