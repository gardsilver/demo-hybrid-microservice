# Kafka Module

## Описание

Реализован базовый функционал для создания **Kafka**-клиента или **Kafka**-сервера.

- **Kafka Common** основной функционал для работы с **Kafka** **Request/Response**.
- **Kafka Server** модуль для настройки **Kafka**-сервера: **Middleware**, **Guards**, **Interceptors**, **Pipes** и т.д.
- **Kafka Client** модуль для настройки и создания **Kafka**-клиента.

### Особенности

Специфика реализации механики **Request/Response** [NestJS Kafka](https://docs.nestjs.com/microservices/kafka) имеет ряд ограничений, которые разрешены в данной реализации. А именно:

- Можно подключить только один микросервис **NestJS Kafka**.

Если подключить несколько брокеров:

```typescript
app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
        ...,
        client: {
           brokers: ['broker1', 'broker2'],
           ...
        },
        ....
    }
});

app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
        ...,
        client: {
           brokers: ['brokerA', 'brokerB'],
           ...
        },
        ....
    }
});
```

Ошибки не будет, но декораторы **MessagePattern** и **EventPattern** равнозначно будут активны на всех микросервисах **NestJS Kafka**. Если подключенные брокеры (`['broker1', 'broker2']` и `['brokerA', 'brokerB']`) предназначены для разных целей и структура топиков у них различна, то неизбежно будут возникать ошибки подключения к несуществующим топикам и ошибки выполнения, когда данные полученные на разных брокерах будут отличаться от ожидаемых приложением.

- Процесс **Request/Response** **NestJS Kafka** подразумевает, что полученный ответ на отправленный запрос будет вычитан консьюмером того же **Pod**-а, что осуществимо только при использовании динамических групп и является очень плохим практическим решением.

- **NestJS Kafka** не поддерживаются методы `Consumer.eachBatch` и `Producer.sendBatch`

- В целом высокая сложность настройки **NestJS Kafka** из-за непрозрачности типизации опций для разных сценариев использования.

- Декораторы  **MessagePattern** и **EventPattern** позволяют задать пользовательские параметры, но использовать их не возможно. Через декоратор **EventKafkaMessage** такие параметры будут доступны в `IConsumerDeserializer` и `KafkaContext.getMessageOptions()`.

- **NestJS Kafka** использует фиксированные названия заголовков (без возможности задания пользовательских вариантов) при отправки запроса для передачи `replyTopic`, `replyPartition` и других данных. Данное решение предоставляет возможность индивидуально настроить данное поведение при необходимости.

## Структура модуля

Модуль разбит на три части по схеме `*-common / *-server / *-client`

| Подмодуль | Назначение |
|---|---|
| [`kafka-common`](./kafka-common/README.md) | Общие типы, заголовочный адаптер в `GeneralAsyncContext`, билдеры опций `KafkaOptionsBuilder`, форматеры логов `KafkaJSError`. Используется и сервером, и клиентом. |
| [`kafka-server`](./kafka-server/README.md) | Серверная часть: декоратор `@EventKafkaMessage`, режимы консьюмера (`EACH_MESSAGE` / `EACH_BATCH`), `KafkaErrorFilter`, `KafkaServerHealthIndicator`, интеграция с `graceful-shutdown`. |
| [`kafka-client`](./kafka-client/README.md) | Клиентская часть: `KafkaClientService` c метриками и иерархией ошибок (`External` / `Internal` / `Timeout`), `KafkaClientProxy` для `send` / `sendBatch`. |

## Переменные окружения

| Переменная | Тип | По умолчанию | Описание |
|---|---|---|---|
| `KAFKA_BROKERS` | CSV | `kafka:9092` | Список брокеров **Kafka**. |
| `KAFKA_CLIENT_ID` | string | `demo-hybrid-microservice` | Идентификатор **Kafka**-клиента. |
| `KAFKA_GROUP_ID` | string | `demo-hybrid-microservice-group` | Идентификатор группы консьюмеров. |
| `KAFKA_RETRY_STATUS_CODES` | CSV | — | Коды ошибок (например `3,14`), при получении которых клиент выполнит повторную отправку. |

Чтение и валидация переменных — `AppKafkaConfig` (**@see** `src/core/app/services/app.kafka.config.ts`).

## Известные проблемы

### `TimeoutNegativeWarning` при запуске на Node.js >= 24

В `stderr` при старте может появляться предупреждение вида:

```
(node:XX) TimeoutNegativeWarning: -XXXXXXXXXX is a negative number.
Timeout duration was set to 1.
```

Причина — баг `kafkajs` (`node_modules/kafkajs/src/consumer/index.js:300`): при `KafkaJSNumberOfRetriesExceeded` в `e.retryTime` попадает экспоненциально выросшее отрицательное значение, передаваемое в `setTimeout()`. В Node < 24 оно молча приводилось к `1 ms`, в Node 24 — печатается warning. 

На работу приложения это не влияет (таймаут корректно устанавливается в 1 мс). При необходимости warning подавляется опцией `NODE_OPTIONS=--disable-warning=TimeoutNegativeWarning`.
