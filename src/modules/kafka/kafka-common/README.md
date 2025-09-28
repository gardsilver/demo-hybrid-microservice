# Kafka Common

Основной функционал для работы с **Kafka** Request/Response.

## ВАЖНО

Для получения нормализованных заголовков `IHeaders` (**@see** `src/modules/common`) из **Kafka** Request/Response используйте `KafkaHeadersHelper.normalize`.

```typescript
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';

...
const headers = KafkaHeadersHelper.normalize(kafkaMessage.headers);
...

```

### `IKafkaAsyncContext` и `KafkaAsyncContext`

Асинхронный контекст выполнения **Kafka**.

- `replyTopic` топик для отправки ответов на полученное сообщение
- `replyPartition` partition для отправки ответов на полученное сообщение

### `KafkaAsyncContextHeaderNames`

Описаны имена **Kafka**-headers содержащие информацию асинхронного контекста выполнения (такие как параметры сквозного логирования `IGeneralAsyncContext`: **@see** `src/modules/common` и др.).

- `KafkaAsyncContextHeaderNames.nameAsHeaderName` - позволяет получить имя заголовка для параметра `IKafkaAsyncContext`
- `KafkaAsyncContextHeaderNames.toAsyncContext` - позволяет получить `IKafkaAsyncContext` из  **Kafka** заголовков `IHeaders` (**@see** `src/modules/common`).

#### ВАЖНО

Не следует на прямую использовать `KafkaHeadersHelper` для получения данных асинхронного контекста. Для этого нужно использовать адаптер соответствующий интерфейсу `IKafkaHeadersToAsyncContextAdapter`. Можно использовать `HttpHeadersToAsyncContextAdapter` или реализовать свой.

### Record Formatters

#### `KafkaJsErrorObjectFormatter`

Реализует форматирование всех ошибок `KafkaJSError` (**@see** `kafkajs`).

```typescript
import { ElkLoggerConfig, ElkLoggerModule } from 'src/modules/elk-logger';
import { KafkaJsErrorObjectFormatter } from 'src/modules/http/http-common';
...

  imports: [
    ...
    ElkLoggerModule.forRoot({
      ...,
      exceptionFormatters: [..., new KafkaJsErrorObjectFormatter()],
    }),
  ]
...
```

### Восстановление подключения

Обязательно [ознакомьтесь](https://kafka.js.org/docs/configuration#default-retry).
В настоящем разделе используются параметры аналогичные другим интеграциям:

```typescript
export interface IRetryOptions {
  retry?: boolean;
  timeout?: number;
  delay?: number;
  retryMaxCount?: number;
  statusCodes?: Array<string | number>;
}
```

Поскольку в разных сценариях могут быть задействованы только определенные параметры, то реализованы билдеры для формирования соответствующего набора в каждом из сценарии **@see** `KafkaOptionsBuilder`.

- `KafkaOptionsBuilder.createRetryOptions` основные параметры переотправки без использования `restartOnFailure`.
- `KafkaOptionsBuilder.createRetryOptionsWithRestartOnFailure` добавляет стратегию восстановления подключения `restartOnFailure`.

Стратегия восстановления подключения остановит процесс переподключения, только если будет задан список исключений `IRetryOptions.statusCodes`, в котором проверка соответствия реализована в виде:

```typescript
const errorType = error.name ?? error.constructor.name;
const isStop = this.isStop || (options.statusCodes?.length && options.statusCodes.includes(errorType));
```

Флаг `isStop` будет автоматически установлен при получении сигнала о завершении работы приложения **SIGTERM**  (**@see** `src/modules/graceful-shutdown`)

### Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`KAFKA_CONNECTION_RESTART`|**labelNames** `['service', 'errorType']`| Количество запусков сценария restartOnFailure. |
