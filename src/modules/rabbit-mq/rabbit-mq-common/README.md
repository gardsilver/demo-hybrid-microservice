# RabbitMq Common

Описаны основные типы и базовый функционал для работы с **RabbitMq** **Request/Response**.

## ВАЖНО

Для получения нормализованных заголовков `IRabbitMqHeaders` из **RabbitMq** **Request/Response** используйте `RabbitMqMessageHelper.normalize`.

```typescript
import { ConsumeMessage } from 'amqplib';
import { RabbitMqMessageHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';

...
const message: ConsumeMessage;
...
const headers = RabbitMqMessageHelper.normalize(message.properties?.headers ?? {});
...

```

### `IRabbitMqAsyncContext` и `RabbitMqAsyncContext`

Асинхронный контекст выполнения **RabbitMq**.

- `messageId` **@see** `MessageProperties.messageId` from `amqplib`
- `replyTo` **@see** `MessageProperties.replyTo` from `amqplib`

### `RabbitMqMessageHelper`

Описаны имена **Kafka**-headers содержащие информацию асинхронного контекста выполнения (такие как параметры сквозного логирования `IGeneralAsyncContext`: **@see** `src/modules/common` и др.).

- `RabbitMqMessageHelper.normalize` - нормализует заголовки в сообщении **RabbitMq** (приводит к виду `IRabbitMqHeaders`, а имена заголовков переводит в нижний регистр).
- `RabbitMqMessageHelper.nameAsHeaderName` - позволяет получить имя заголовка для параметра `IRabbitMqAsyncContext`.
- `RabbitMqMessageHelper.toAsyncContext` - позволяет получить `IRabbitMqAsyncContext` из свойств сообщения **RabbitMq** `IRabbitMqMessageProperties`.

#### ВАЖНО

Не следует на прямую использовать `RabbitMqMessageHelper` для получения данных асинхронного контекста. Для этого нужно использовать адаптер соответствующий интерфейсу `IRabbitMqMessagePropertiesToAsyncContextAdapter`. Можно использовать `RabbitMqMessagePropertiesToAsyncContextAdapter` или реализовать свой.


### `IRabbitMqPublishOptionsBuilder`

Для построения опций отправки сообщения (**@see** `IRabbitMqPublishOptions`) в брокер **RabbitMq** на основе `IRabbitMqAsyncContext` используйте `IRabbitMqPublishOptionsBuilder`. Можно реализовать свой или использовать `RabbitMqPublishOptionsBuilder`.

#### `RabbitMqFormatterHelper`

Предназначен для нормализации и удаления приватных данных из параметров подключения к серверу **RabbitMq**.

- `errorInfoFormat` - удаляет приватные данные подключения к серверу **RabbitMq**. Полезен при написании пользовательских обработчиков событий **RabbitMq**-сервера (**@see** `ConnectFailedListener` form `amqp-connection-manager`)
- `parseUrl` - приводит параметры подключения к серверу **RabbitMq** к виду `IRabbitMqUrl`.

### `RabbitMqError`

Библиотеки `amqplib` и `amqp-connection-manager` не предоставляются специализированных классов ошибок возникающих при взаимодействии с брокером **RabbitMq**. `RabbitMqError` является оболочкой на ошибки получаемые в обработчиках соответствующих событий `RMQErrorInfo`.

### `RabbitMqErrorObjectFormatter`

Лог-форматер ошибки `RabbitMqError`: `IObjectFormatter<RabbitMqError>`.
