# Kafka Client Module

## Описание

Модуль для создания `KafkaClientService` **Kafka**-клиента - пишет логи интеграции и фиксирует соответствующие метрики, реализована логика обработки полученных ошибок.

Все ошибки, возникшие при отправке запроса будут приведены к виду:

- `KafkaClientExternalError` - если возникла сетевая ошибка или ошибка на стороне внешней системы.
- `KafkaClientInternalError` - если ошибка возникла в клиентском коде. Например подготовленные данные для отправки некорректны.
- `KafkaClientTimeoutError` - запрос не был отправлен в рамках установленных временных ограничений.

## Подключение

Для создания `KafkaClientService` необходимо подключить модуль `KafkaClientModule`. Модуль **не** является глобальным — регистрируется через `register()` в месте использования.

```ts
import { Module } from '@nestjs/common';
import { KafkaClientModule } from 'src/modules/kafka/kafka-client';
import { AppKafkaConfig } from 'src/core/app/services/app.kafka.config';

@Module({
  imports: [
    KafkaClientModule.register({
      kafkaClientProxyBuilderOptions: {
        useFactory: (kafkaConfig: AppKafkaConfig) => ({
          serverName: 'demo-kafka',
          client: {
            clientId: kafkaConfig.getClientId(),
            brokers: kafkaConfig.getBrokers(),
          },
          producer: {
            retry: kafkaConfig.getProducerRetry(),
          },
        }),
        inject: [AppKafkaConfig],
      },
      // опционально — свой serializer / headerBuilder / requestOptions
      // serializer: { useClass: MyProducerSerializer },
    }),
  ],
})
export class DemoKafkaIntegrationModule {}
```

Аналогично **Kafka Server** в `KafkaClientModule.register` можно указать универсальные адаптеры `serializer` и `headerBuilder`, которые будут применяться при отправке запроса (при этом всегда в опциях запроса можно указать другие адаптеры).

### Опции `KafkaClientModule.register`

`KafkaClientModule.register()` принимает `IKafkaClientModuleOptions`:

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` | Нет | `[]` | Дополнительные модули для разрешения зависимостей пользовательских провайдеров. |
| `providers` | `Provider[]` | Нет | `[]` | Дополнительные провайдеры, регистрируемые внутри модуля. |
| `kafkaClientProxyBuilderOptions` | `IServiceClassProvider<IKafkaClientServiceOptions>` \| `IServiceValueProvider<IKafkaClientServiceOptions>` \| `IServiceFactoryProvider<IKafkaClientServiceOptions>` | Да | — | Настройки подключения и продьюсера (`serverName`, `client`, `producer`, `logTitle`). |
| `serializer` | `IServiceClassProvider<IProducerSerializer>` \| `IServiceValueProvider<IProducerSerializer>` \| `IServiceFactoryProvider<IProducerSerializer>` | Нет | `ProducerSerializer` (plain-объекты и массивы → JSON-строка, прочие объекты → `toString()`) | Универсальный сериализатор исходящих сообщений. |
| `headerBuilder` | `IServiceClassProvider<IKafkaHeadersRequestBuilder>` \| `IServiceValueProvider<...>` \| `IServiceFactoryProvider<...>` | Нет | `KafkaHeadersRequestBuilder` | Построитель заголовков **Kafka** на базе `IKafkaAsyncContext`. |
| `requestOptions` | `IServiceClassProvider<Omit<IKafkaRequestOptions, 'serializer' \| 'headerBuilder'>>` \| value/factory-аналоги | Нет | `{}` | Дефолтные опции запроса, мёржатся с переданными в `request()`. |

Для каждого поля-провайдера форма DI-провайдера одинакова:

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `useClass` | `Type<T>` | Да (для class-провайдера) | — | Класс провайдера. |
| `useValue` | `T` | Да (для value-провайдера) | — | Готовое значение. |
| `useFactory` | `(...deps) => T \| Promise<T>` | Да (для factory-провайдера) | — | Фабрика, создающая значение. |
| `inject` | `Array<Token>` | Нет | `[]` | Зависимости, передаваемые в `useFactory`. |

Вложенные поля `IKafkaClientServiceOptions` (возвращается из `kafkaClientProxyBuilderOptions`):

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `serverName` | `string` | Да | — | Имя **Kafka**-клиента; используется как идентификатор в логах и метриках. |
| `client` | `KafkaConfig` (`kafkajs`) | Да | — | Опции подключения к брокерам (`clientId`, `brokers`, `ssl`, `sasl` и т.п.). |
| `producer` | `IKafkaProducerOptions` | Нет | `{}` | Настройки продьюсера: `retry`, `allowAutoTopicCreation`, `transactionalId` и т.д. |
| `logTitle` | `string` | Нет | — | Префикс для логов интеграции (`KafkaClientService`). |

Вложенные поля `IKafkaRequestOptions` (для `requestOptions`; `serializer` и `headerBuilder` исключены — задаются на уровне модуля):

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `serializerOption` | `Record<string, unknown>` | Нет | — | Дополнительные опции, пробрасываемые в `IProducerSerializer.serialize`. |
| `headersBuilderOptions` | `IKafkaHeadersBuilderOptions & { skip?: boolean }` | Нет | — | Параметры построения заголовков: `useZipkin`, `asArray`, `skip`. |
| `acks` / `timeout` / `compression` и пр. поля `ProducerRecord` | см. `kafkajs` | Нет | — | Стандартные опции `ProducerRecord` и `Message`, кроме `topic`, `messages`, `key`, `value`, `headers`. |

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

Кодирует данные для отправки **Kafka**-запроса. По умолчанию используется `ProducerSerializer`: plain-объекты и массивы сериализует в `json`-строку, прочие объекты приводит к строке (`obj.toString()`).

## `KafkaClientErrorHandler`

Обработчик ошибок: приводит ошибки к `KafkaClientError` и пишет соответствующий лог.

## `KafkaClientErrorObjectFormatter`

Лог-форматер ошибки `KafkaClientError`: `IObjectFormatter<ServiceError>`

## Отправка сообщения

`KafkaClientService.request()` принимает одно сообщение (`ProducerMode.SEND`) или массив (`ProducerMode.SEND_BATCH`) и возвращает `RecordMetadata[]`. Метод автоматически пишет request-лог, метрику длительности и, в случае ошибки, приводит её к `KafkaClientError` через `KafkaClientErrorHandler`.

```ts
import { Injectable } from '@nestjs/common';
import { KafkaClientService } from 'src/modules/kafka/kafka-client';

@Injectable()
export class DemoKafkaProducer {
  constructor(private readonly kafkaClient: KafkaClientService) {}

  async publish(payload: { id: string; data: unknown }): Promise<void> {
    await this.kafkaClient.request({
      topic: 'DemoRequest',
      data: {
        key: payload.id,
        value: payload,
        headers: { 'x-custom-header': 'value' },
      },
    });
  }

  async publishBatch(items: Array<{ id: string; data: unknown }>): Promise<void> {
    await this.kafkaClient.request(
      items.map((item) => ({
        topic: 'DemoRequest',
        data: { key: item.id, value: item },
      })),
    );
  }
}
```

Заголовки трассировки (`traceId`, `spanId` и пр.) добавляются автоматически `KafkaHeadersRequestBuilder` из текущего `GeneralAsyncContext`. Пользовательские заголовки, переданные в `IKafkaMessage.headers`, объединяются с ними.

## Поведение retry

Стратегия восстановления соединения (опция `retry` на уровне клиента/продьюсера) описана в [kafka-common](../kafka-common/README.md#Восстановление-подключения) — это параметры `retries`, `maxRetryTime`, `initialRetryTime`, `factor`, `multiplier`. Дефолтные значения для продьюсера отдаёт `AppKafkaConfig.getProducerRetry()`.

Дополнительно `KAFKA_RETRY_STATUS_CODES` позволяет задать список кодов ошибок брокера, при которых продьюсер повторит отправку запроса. Список читается `AppKafkaConfig.getRetryStatusCodes()` и передаётся в `producer.retry`.

## Переменные окружения

| Переменная | Тип | По умолчанию | Описание |
|---|---|---|---|
| `KAFKA_BROKERS` | CSV | `kafka:9092` | Список брокеров. |
| `KAFKA_CLIENT_ID` | string | `demo-hybrid-microservice` | Идентификатор клиента. |
| `KAFKA_RETRY_STATUS_CODES` | CSV | — | Коды ошибок, при которых продьюсер повторит отправку (например `3,14`). |

## Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`KAFKA_EXTERNAL_REQUEST_DURATIONS`|**labelNames** `['service', 'topics', 'method']`| Гистограмма длительностей отправки **Kafka**-запросов и их количество |
|`KAFKA_EXTERNAL_REQUEST_FAILED`|**labelNames** `['service', 'topics', 'method', 'statusCode', 'type']`| Количество ошибок при попытке отправить **Kafka**-запрос |
