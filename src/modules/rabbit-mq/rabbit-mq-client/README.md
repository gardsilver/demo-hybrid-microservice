# RabbitMq Client

## Описание

Модуль для создания `RabbitMqClientService` **RabbitMq**-клиента - пишет логи интеграции и фиксирует соответствующие метрики, реализована логика обработки полученных ошибок.

Все ошибки, возникшие при отправке запроса будут приведены к виду:

- `RabbitMqClientExternalError` - если возникла сетевая ошибка или ошибка на стороне внешней системы.
- `RabbitMqClientInternalError` - если ошибка возникла в клиентском коде. Например подготовленные данные для отправки некорректны.
- `RabbitMqClientTimeoutError` - запрос не был отправлен в рамках установленных временных ограничений.

## Параметры окружения

| Переменная | Тип | Описание |
|---|---|---|
| `RABBIT_MQ_URLS` | string (CSV) | Список адресов брокеров **RabbitMQ**. Пример: `rabbitmq:5672,rabbitmq2:5672`. |
| `RABBIT_MQ_USER` | string | Имя пользователя **RabbitMQ**. |
| `RABBIT_MQ_PASSWORD` | string | Пароль пользователя **RabbitMQ**. |

## Подключение

Для создания `RabbitMqClientService` необходимо подключить модуль `RabbitMqClientModule` через `register(...)`. Модуль НЕ является глобальным.

```ts
import { RabbitMqClientModule } from 'src/modules/rabbit-mq/rabbit-mq-client';

@Module({
  imports: [
    ...
    RabbitMqClientModule.register({
      clientProxyBuilderOptions: {
        useFactory: (configService: ConfigService) => ({
          serverName: 'my-rmq',
          producer: {
            urls: [...],
            exchange: 'my-exchange',
            publishOptions: { persistent: true },
          },
        }),
        inject: [ConfigService],
      },
      // опционально — свой serializer / publishOptionsBuilder
    }),
  ],
})
export class MyModule {}
```

`RabbitMqClientModule.register()` принимает `IRabbitMqClientModuleOptions`:

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` | Нет | `[]` | Дополнительные модули для разрешения зависимостей пользовательских провайдеров. |
| `providers` | `Provider[]` | Нет | `[]` | Дополнительные провайдеры, регистрируемые внутри модуля. |
| `clientProxyBuilderOptions` | `IServiceClassProvider<IRabbitMqClientOptions>` \| `IServiceValueProvider<IRabbitMqClientOptions>` \| `IServiceFactoryProvider<IRabbitMqClientOptions>` | Да | — | Настройки **RabbitMQ**-клиента (`serverName` и параметры `producer`). Поля `serializer` / `publishOptionsBuilder` в `producer` игнорируются — задаются отдельными полями модуля. |
| `serializer` | `IServiceClassProvider<IProducerSerializer>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `ProducerSerializer` (массивы → JSON-строка, объекты → `toString()`) | Универсальный сериализатор исходящих сообщений. |
| `publishOptionsBuilder` | `IServiceClassProvider<IRabbitMqPublishOptionsBuilder>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `RabbitMqPublishOptionsBuilder` (**@see** `src/modules/rabbit-mq/rabbit-mq-common`) | Построитель `IRabbitMqPublishOptions` на основе `IRabbitMqAsyncContext`. |

Форма DI-провайдера (одинакова для `clientProxyBuilderOptions`, `serializer`, `publishOptionsBuilder`):

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `useClass` | `Type<T>` | Да (для class-провайдера) | — | Класс провайдера. |
| `useValue` | `T` | Да (для value-провайдера) | — | Готовое значение. |
| `useFactory` | `(...deps) => T \| Promise<T>` | Да (для factory-провайдера) | — | Фабрика, создающая значение. |
| `inject` | `Array<Token>` | Нет | `[]` | Зависимости, передаваемые в `useFactory`. |

Вложенные поля `IRabbitMqClientOptions` (возвращается из `clientProxyBuilderOptions`):

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `serverName` | `string` | Да | — | Имя **RabbitMQ**-клиента; используется как идентификатор в логах и метриках. |
| `producer` | `Partial<IRabbitMqConnectionOptions & IRabbitMqChannelOptions> & { serializer?; serializerOption?; publishOptionsBuilder?; publishOptionsBuilderOptions?; publishOptions? }` | Да | — | Настройки подключения (`urls`, `socketOptions`, `heartbeatIntervalInSeconds`, `reconnectTimeInSeconds`, `maxConnectionAttempts`) и канала (`exchange`, `exchangeArguments`, `queue`, `queueOptions`), а также дефолтные `publishOptions`. |

Вложенные поля `producer.publishOptions` и `producer.publishOptionsBuilderOptions`:

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `producer.publishOptions` | `IRabbitMqPublishOptions` | Нет | — | Дефолтные опции `amqplib` для `publish` / `sendToQueue` (`persistent`, `headers`, `expiration`, `priority` и т.п.). |
| `producer.publishOptionsBuilderOptions` | `IRabbitMqPublishOptionsBuilderOptions & { skip?: boolean }` | Нет | — | Параметры `publishOptionsBuilder`: управляют добавлением заголовков трассировки; `skip: true` полностью отключает построитель. |
| `producer.serializerOption` | `Omit<IProducerSerializerOptions, 'serverName' \| 'pattern'>` | Нет | — | Дополнительные опции, пробрасываемые в `IProducerSerializer.serialize`. |

Универсальные адаптеры `serializer` и `publishOptionsBuilder` применяются при отправке по умолчанию. В конкретном вызове `request` их можно переопределить через `IRabbitMqSendOptions`.

После успешного подключения будут доступны следующие сервисы:

|**DI-токен**|**Интерфейс**|**Описание**|
|---|---|---|
|`RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI`| `IRabbitMqPublishOptionsBuilder` (**@see** `src/modules/rabbit-mq/rabbit-mq-common`) | Строит параметры отправки на основе `IRabbitMqAsyncContext` для отправки сообщения |
|`RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI`| `IProducerSerializer`| Реализует кодирование данных пред отправкой |
|`RABBIT_MQ_CLIENT_PROXY_DI`| `RabbitMqClientProxy`| Аналог `ClientRMQ` (**@see** `@nestjs/microservices`). Реализует метод отправки сообщения `send` позволяющий оправить сообщение с использованием `publish` или `sendToQueue`, который возвращают `Observable` и требуют явно подписаться на него, что бы сообщение было отправлено |
|`RabbitMqClientService`| `RabbitMqClientService`| Клиент оболочка на `RabbitMqClientProxy`. Предоставляет один универсальный метод отправки отправки запроса `request`, фиксирует логи и метрики |
|`RabbitMqClientErrorHandler`| `RabbitMqClientErrorHandler`| Обработчик ошибок, пишет соответствующие логи |


## Отправка сообщения

`RabbitMqClientService.request` отправляет сообщение через `publish` / `sendToQueue` (в зависимости от наличия `exchange` / `queue` в `IRabbitMqProducerMessage`), фиксирует метрики и логи, приводит ошибки к соответствующему `RabbitMqClientError`.

```ts
import { Inject, Injectable } from '@nestjs/common';
import { RabbitMqClientService } from 'src/modules/rabbit-mq/rabbit-mq-client';

@Injectable()
export class MyPublisher {
  constructor(private readonly client: RabbitMqClientService) {}

  async publish(payload: { id: number }): Promise<void> {
    await this.client.request({
      exchange: 'my-exchange',
      routingKey: 'my.route',
      content: payload,
      publishOptions: {
        headers: { 'x-custom': 'value' },
        persistent: true,
      },
    });
  }
}
```

Заголовки сквозного логирования (`traceId`, `spanId`, `requestId`) автоматически добавляются `RabbitMqPublishOptionsBuilder` на основе текущего `IRabbitMqAsyncContext` (**@see** `src/modules/rabbit-mq/rabbit-mq-common`).

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
