# Kafka Common

Основной функционал для работы с **Kafka** **Request/Response**.

## ВАЖНО

Для получения нормализованных заголовков `IHeaders` (**@see** `src/modules/common`) из **Kafka** **Request/Response** используйте `KafkaHeadersHelper.normalize`.

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

```ts
export enum KafkaAsyncContextHeaderNames {
  REPLY_TOPIC = 'x-reply-topic',
  REPLY_PARTITION = 'x-reply-partition',
}
```

- `KafkaHeadersHelper.nameAsHeaderName` - позволяет получить имя заголовка для параметра `IKafkaAsyncContext`
- `KafkaHeadersHelper.toAsyncContext` - позволяет получить `IKafkaAsyncContext` из  **Kafka** заголовков `IHeaders` (**@see** `src/modules/common`).

#### ВАЖНО

Не следует на прямую использовать `KafkaHeadersHelper` для получения данных асинхронного контекста. Для этого нужно использовать адаптер соответствующий интерфейсу `IKafkaHeadersToAsyncContextAdapter`. Можно использовать `KafkaHeadersToAsyncContextAdapter` или реализовать свой.

```ts
import { KafkaHeadersToAsyncContextAdapter, KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { GeneralAsyncContext } from 'src/modules/async-context';

const adapter = new KafkaHeadersToAsyncContextAdapter();
const headers = KafkaHeadersHelper.normalize(kafkaMessage.headers);
const asyncContext = adapter.adapt(headers);

await GeneralAsyncContext.instance.runWithContextAsync(asyncContext, async () => {
  // контекст (traceId, spanId, replyTopic, replyPartition) доступен ниже по стеку
});
```

### Общие типы

Модуль экспортирует базовые типы сообщений и опций, используемые и в `kafka-server`, и в `kafka-client`:

- `IKafkaMessage<T>` — `{ key?: string | null; value: T; headers?: IHeaders }`.
- `IKafkaClientOptions`, `IKafkaConsumerOptions`, `IKafkaProducerOptions` — обёртки над `KafkaOptions` из `@nestjs/microservices` с упрощённым доступом к `retry`-настройкам и поддержкой `logFilterParams`.
- `IKafkaClientProxyBuilderOptions` — корневые опции для `KafkaOptionsBuilder` (включая обязательное поле `serverName`).
- `IKafkaHealthIndicatorOptions` — параметры `KafkaServerHealthIndicator` (`useAdmin`, `retry`).

### Record Formatters

#### `KafkaJsErrorObjectFormatter`

Реализует форматирование всех ошибок `KafkaJSError` (**@see** `kafkajs`): `IObjectFormatter<KafkaJSError>`.

```typescript
import { ElkLoggerConfig, ElkLoggerModule } from 'src/modules/elk-logger';
import { KafkaJsErrorObjectFormatter } from 'src/modules/kafka/kafka-common';
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

Обязательно [ознакомьтесь](https://kafka.js.org/docs/configuration#default-retry):

```typescript
export interface RetryOptions {
  maxRetryTime?: number;
  initialRetryTime?: number;
  factor?: number;
  multiplier?: number;
  retries?: number;
  restartOnFailure?: (e: Error) => Promise<boolean>;
}
```

Поскольку в разных сценариях могут быть задействованы только определенные параметры, то реализованы билдеры для формирования соответствующего набора в каждом из сценарии **@see** `KafkaOptionsBuilder`. В частности для консьюмеров всегда будет добавляться метод `restartOnFailure`, который фиксирует лог и вернет `false`, если был послан сигнал о завершении работы приложения **SIGTERM**  (**@see** `src/modules/graceful-shutdown`).

### Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`KAFKA_CONNECTION_RESTART`|**labelNames** `['service', 'errorType']`| Количество запусков сценария restartOnFailure. |

### Замечания

Опция `retry` отвечает за стратегию установки соединения, в которой можно задать следующие параметры:

- `retries` количество попыток установки соединения.
- `maxRetryTime` в `ms` длительность, в течении которой будут запускаться повторные попытки установления соединения.
- `initialRetryTime` в `ms` задает начальную паузу перед началом следующей попытки установления соединения.
- `multiplier` и `factor` веса влияющие на вычисление длины паузы перед началом следующей попытки установления соединения.

Соответственно, если за отведенное время (`maxRetryTime`) и/или указанное количество попыток (`retries`) соединение не будет установлено, то процесс будет прерван с выбрасываем соответствующего исключения. При этом о всех не удавшихся попытках будут активно писаться логи, которые по факту не информативны и излишни. Чтобы минимизировать количество логов в `KafkaElkLoggerBuilder` определена дополнительная фильтрация логов. Если для отладки нужно отключить или изменить фильтры используйте параметр: `logFilterParams` (**@see** `IKafkaClientOptions`). Например, если задать: `logFilterParams=[]`, то фильтрация будет отключена.
