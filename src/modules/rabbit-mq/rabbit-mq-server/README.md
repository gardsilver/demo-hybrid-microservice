# RabbitMq Server

## Описание

Модуль для создания и настройки **RabbitMq**-сервера: **Middleware**, **Guards**, **Interceptors**, **Pipes** и т.д.

- Реализована логика автоматического восстановления соединения с брокером **RabbitMq**.
- Реализован `RabbitMqHealthIndicator`
- Настроено логирование и фиксирование базовых метрик.
- Добавлена поддержка одновременного подключения к нескольким независимым брокерам **RabbitMq**.
- Реализована возможность установки пользовательских адаптеров сообщений **RabbitMq** для каждого консьюмера.

### ВАЖНО

Данный модуль не реализует логику **Request/Response**. Вам будет доступен только функционал обработки полученного сообщения (сообщений) для каждого консьюмера (**@see** декоратор `EventRabbitMqMessage`).

Если не задан `deserializer`, то в полученных данных будут нормализованы только `headers` (**@see** `RabbitMqMessageHelper` `src/modules/rabbit-mq/rabbit-mq-common`).

Данный модуль игнорирует настройки декораторами `MessagePattern` и `EventPattern`  (**@see** `@nestjs/microservices`). Для настройки консьюмеров используйте `EventRabbitMqMessage`.

## Параметры окружения

| Переменная | Тип | Описание |
|---|---|---|
| `RABBIT_MQ_URLS` | string (CSV) | Список адресов брокеров **RabbitMQ**. Пример: `rabbitmq:5672,rabbitmq2:5672`. |
| `RABBIT_MQ_USER` | string | Имя пользователя **RabbitMQ**. |
| `RABBIT_MQ_PASSWORD` | string | Пароль пользователя **RabbitMQ**. |

## Использование

### Подключение модуля **RabbitMqServerModule**

- `RabbitMqServerModule.forRoot(...)` регистрирует модуль глобально (`global: true`), создаёт сервисы, реагирующие на общее состояние приложения (**@see** `src/modules/graceful-shutdown`) и на состояние подключённых консьюмеров.
- `RabbitMqServerStatusService` будет доступен после успешного подключения `RabbitMqServerModule`. Позволяет получить `RabbitMqHealthIndicator` и в случае завершения приложения остановит работу всех **Consumer**.
- По умолчанию используется адаптер заголовков сообщения `RabbitMqMessagePropertiesToAsyncContextAdapter` (**@see** `src/modules/rabbit-mq/rabbit-mq-common`). Его можно переопределить через `messagePropertiesAdapter` параметра `IRabbitMqServerModuleOptions`.

```ts
import { Module } from '@nestjs/common';
import { RabbitMqServerModule } from 'src/modules/rabbit-mq/rabbit-mq-server';

@Module({
  imports: [
    ...
    RabbitMqServerModule.forRoot(),
    ...
  ],
})
export class MainModule {}
```

`RabbitMqServerModule.forRoot()` принимает `IRabbitMqServerModuleOptions`:

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` | Нет | `[]` | Дополнительные модули для разрешения зависимостей пользовательских провайдеров. |
| `providers` | `Provider[]` | Нет | `[]` | Дополнительные провайдеры, регистрируемые внутри `RabbitMqServerModule`. |
| `messagePropertiesAdapter` | `IServiceClassProvider<IRabbitMqMessagePropertiesToAsyncContextAdapter>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `RabbitMqMessagePropertiesToAsyncContextAdapter` из `rabbit-mq-common` | Переопределение адаптера преобразования `MessageProperties` **RabbitMQ** в `GeneralAsyncContext`. |

Форма провайдера `messagePropertiesAdapter` — один из трёх типов:

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `useClass` | `Type<IRabbitMqMessagePropertiesToAsyncContextAdapter>` | Да (для class-провайдера) | — | Класс адаптера. |
| `useValue` | `IRabbitMqMessagePropertiesToAsyncContextAdapter` | Да (для value-провайдера) | — | Готовый экземпляр адаптера. |
| `useFactory` | `(...deps) => IRabbitMqMessagePropertiesToAsyncContextAdapter \| Promise<...>` | Да (для factory-провайдера) | — | Фабрика, создающая адаптер. |
| `inject` | `Array<Token>` | Нет | `[]` | Зависимости, передаваемые в `useFactory`. |

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
|`serverName`| Имя **RabbitMq**-сервера, используется как идентификатор для настройки консьюмеров, и он же будет отображать состояние данного сервера в  `RabbitMqHealthIndicator` |  |
|`urls`| Список URL-адресов для повторных попыток подключения к **RabbitMq**-серверу |  |
|`consumer`| Опции настройки подключения к **RabbitMq**-серверу и настройки консьюмеров по умолчанию. <br>  - `socketOptions.connectionOptions` опции подключения к **RabbitMq**-серверу <br>  - `socketOptions.heartbeatIntervalInSeconds` heartbeat в сек. <br>  - `socketOptions.reconnectTimeInSeconds` пауза в сек. между повторными попытками подключения <br>  - `maxConnectionAttempts` определяет максимальное количество повторных подключений. При достижении указанного значения будет выброшена соответствующая ошибка, а процесс повторных подключений остановлен. Значение `-1` (по умолчанию) отключает контроль количества повторных подключений. <br>  - `queueOptions` опции настройки очередей, которые будут использоваться по умолчанию. <br>  - `exchangeArguments` аргументы `exchange`, которые будут использоваться по умолчанию |  |

### Настройки консьюмеров

Для создания консьюмера необходимо использовать декоратор `EventRabbitMqMessage`:

```typescript

import { Ctx, Payload } from '@nestjs/microservices';
import { IRabbitMqConsumeMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { EventRabbitMqMessage, RabbitMqContext } from 'src/modules/rabbit-mq/rabbit-mq-server';
...

  @EventRabbitMqMessage('request', { // идентификатор консьюмера.
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
- `getMessageOptions()` опции `IRabbitMqEventOptions & { pattern: string }`, в которых будут данные `serverName`, идентификатор консьюмера (`pattern`) и используемой очереди (`queue`).

Декоратор `EventRabbitMqMessage` полностью соответствует декоратору `EventPattern` (**@see** `@nestjs/microservices`) и в сочетании с ним можно дополнительно использовать стандартные декораторы `Payload` и `Ctx`, как на примере выше.

#### Параметры `EventRabbitMqMessage(metadata, options)`

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `metadata` | `string \| string[]` (обобщённый `T`) | Нет | Идентификатор консьюмера (`pattern`). Передаётся в базовый `EventPattern` и используется для привязки обработчика к очереди. |
| `options` | `IEventRabbitMqMessageOptions<K>` либо функция, возвращающая такой объект | Нет | Настройки консьюмера для данного обработчика. Функция вычисляется во время применения декоратора. |

Поля `options` (`IEventRabbitMqMessageOptions<K>`):

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `serverName` | `string` | Да | Идентификатор **RabbitMq**-сервера. Должен совпадать со `serverName`, переданным в `RabbitMqMicroserviceBuilder.setup`. |
| `consumer` | `Partial<IRabbitMqChannelOptions & IRabbitMqConsumerOptions>` | Нет | Переопределение опций канала и консьюмера для данного обработчика (очередь, exchange, routing keys, prefetch, `queueOptions`, `exchangeArguments` и т.п.). Сливается с настройками по умолчанию из `RabbitMqMicroserviceBuilder.setup`. |
| `deserializer` | `IConsumerDeserializer<K>` | Нет | Пользовательский десериализатор `ConsumeMessage`. Если задан, универсальный `deserializer` из `RabbitMqMicroserviceBuilder.setup` игнорируется. |
| `[key: string]` | `unknown` | Нет | Любые дополнительные поля — пробрасываются в метаданные `EventPattern` как `extras`. |

### Фильтрация сообщений

Если `deserializer` вернет данные с `IConsumerPacket.data === undefined`, то такое сообщение не будет обрабатываться.

Настроить `deserializer` можно очень гибко:

- Реализовать универсальный `deserializer` и подключить его через `RabbitMqMicroserviceBuilder.setup`.

Доступ к `serverName` и `pattern` (идентификатор консьюмера) в `deserializer` будет всегда (**@see** `options: IRabbitMqEventOptions`), поэтому можно организовать выбор способа десериализации для `ConsumeMessage` (**@see** `amqplib`).

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
