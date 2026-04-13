# Graceful Shutdown Module

### Описание

Данный модуль запускает процесс плавного завершения приложения при получении сигнала **SIGTERM** (**@see** `GRACEFUL_SHUTDOWN_DESTROY_SIGNAL`).

`UncaughtExceptionFilter` добавляет обработчики событий `uncaughtException` и `uncaughtRejection`, которые фиксируют логи и метрики о возникновении не обработанных ошибок и посылают сигнал **SIGTERM** (**@see** `GRACEFUL_SHUTDOWN_DESTROY_SIGNAL`), тем самым запуская процесс плавного завершения приложения.

## Важно

Для корректной работы модуля необходимо вызвать `app.enableShutdownHooks()` на старте приложения.

### Принцип работы `UncaughtExceptionFilter`

При получении события `uncaughtException` или `uncaughtRejection` запускается процесс плавного завершения приложения:

1. Пишется лог о возникновении непредвиденной ошибки.
2. Регистрируются соответствующие метрики

- `UNCAUGHT_EXCEPTION_COUNT`
- `UNCAUGHT_REJECTION_COUNT`

3. Отправляется сигнал **SIGTERM** (**@see** `GRACEFUL_SHUTDOWN_DESTROY_SIGNAL`), начинается [процесс завершения приложения](https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown)

### Декоратор метода `GracefulShutdownOnCount`

  Декорируемый метод будет учитываться счетчиком активных процессов **@see** `ACTIVE_METHODS_GAUGE`.

  Имейте ввиду, что данный метод не имеет возможности учитывать моменты завершения запущенных асинхронных под-процессов. Если логика требует запуска асинхронных под-процессов, которые также важные при подсчете количества активных процессов, следует к таким под-процессам дополнительно добавлять данный декоратор.

  Декоратор **не принимает аргументов** — вызывается как `@GracefulShutdownOnCount()`. Инкремент/декремент счётчика и расчёт `duration` выполняются автоматически сервисом `GracefulShutdownService` через внутренние метаданные (`increment`, `decrement`, `instance`), которые устанавливаются при инициализации модуля.

#### ВАЖНО

Декоратор метода `GracefulShutdownOnCount` переопределяет декорируемый метод. Если вы применяете этот декоратор в сочетании с другими декораторами, активно использующие метаданные, то могут быть скрытые ошибки из-за потери метаданных последними.
При возникновении подобной проблемы помогает:

- смена порядка применения декораторов
- или применение конфликтующих декораторов на разные методы.

### Декоратор метода `GracefulShutdownOnEvent`

  Декорируемый метод будет вызван при возникновении соответствующего события:

- `GracefulShutdownEvents.BEFORE_DESTROY`
- `GracefulShutdownEvents.AFTER_DESTROY`.

  Принимает объект `GracefulShutdownEventMetadata`:

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `event` | `GracefulShutdownEvents` | да | Событие, на которое подписывается метод: `BEFORE_DESTROY` или `AFTER_DESTROY`. |
| `message` | `string` | нет | Произвольное сообщение, сохраняется в `ResolveEventType.message` и попадает в итоговый отчёт `ResultsEventType.details`. |

### ВАЖНО

  Декораторы требуют инициализации, а значит они должны быть применены на методы, которые будут использоваться после успешной инициализации `GracefulShutdownModule`.
  Аналогично, события `uncaughtException` и `uncaughtRejection` будут обрабатываться только после успешной инициализации модуля.

### Трёхфазное завершение работы `GracefulShutdownService`

1. **BEFORE_DESTROY** — при получении сигнала **SIGTERM** (**@see** `GRACEFUL_SHUTDOWN_DESTROY_SIGNAL`) срабатывает lifecycle hook `beforeApplicationShutdown` и запускаются обработчики события `GracefulShutdownEvents.BEFORE_DESTROY`.

   Такие обработчики, например, могут закрыть консьюмеры очередей или отключить крон-процессы.

   По завершении работы обработчиков данного события не должны появляться новые активные процессы (**@see** `GracefulShutdownOnCount`).

   Если обработчики не успеют завершиться за `GRACEFUL_SHUTDOWN_TIMEOUT_ON_BEFORE_DESTROY` mc будет выброшена ошибка `TimeoutError` и процесс плавного завершения приложения будет прерван.

2. **DESTROY** — ожидание пока счетчик активных процессов не станет равным **0**.

   Что бы метод учитывался счетчиком активных процессов, к нему нужно добавить декоратор `GracefulShutdownOnCount`.

   Все активные процессы должны завершиться не более чем за `GRACEFUL_SHUTDOWN_TIMEOUT_ON_DESTROY` mc. В противном случае будет выброшена ошибка `TimeoutError` и процесс плавного завершения приложения будет прерван.

3. **AFTER_DESTROY** — запускаются обработчики события `GracefulShutdownEvents.AFTER_DESTROY`.

   Если обработчики не успеют завершиться за `GRACEFUL_SHUTDOWN_TIMEOUT_ON_AFTER_DESTROY` mc будет выброшена ошибка `TimeoutError` и процесс плавного завершения приложения будет прерван.

4. **Grace Period** — не зависимо от того, как завершатся предыдущие этапы (успешно или нет) приложение будет ожидать дополнительные `GRACEFUL_SHUTDOWN_GRACE_PERIOD` mc. Нужно что бы сборщики логов/метрик смогли забрать всю зафиксированную информацию о процессе плавного завершения приложения. После этого вызывается `process.exit()`.

## ВАЖНО

Из-за внутренних ограничений платформы, **NestJS** имеет ограниченную поддержку хуков завершения приложений в **Windows**
[@see](https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown). В частности **SIGTERM** (**@see** `GRACEFUL_SHUTDOWN_DESTROY_SIGNAL`) никогда не будет работать в **Windows**.

### Параметры окружения

| Параметры окружения (**env**)| Обязательный | Возможные значения | Описание|
|---|---|---|---|
|`GRACEFUL_SHUTDOWN_ENABLED`|нет. По умолчанию: **yes** | Строка: **yes** или **no** (без учета регистра) | Позволяет включать/отключать процесс плавного завершения приложения. |
|`GRACEFUL_SHUTDOWN_TIMEOUT_ON_BEFORE_DESTROY`|нет. По умолчанию: **10000** | Целое число в миллисекундах | Задает максимальное время выполнения этапа **Before Destroy**. |
|`GRACEFUL_SHUTDOWN_TIMEOUT_ON_DESTROY`|нет. По умолчанию: **30000** | Целое число в миллисекундах | Задает максимальное время выполнения этапа **Destroy**. |
|`GRACEFUL_SHUTDOWN_TIMEOUT_ON_AFTER_DESTROY`|нет. По умолчанию: **10000** | Целое число в миллисекундах | Задает максимальное время выполнения этапа **After Destroy**. |
|`GRACEFUL_SHUTDOWN_GRACE_PERIOD`|нет. По умолчанию: **15000** | Целое число в миллисекундах | Задает время ожидания перед завершение работы приложения. |
|`GRACEFUL_SHUTDOWN_DESTROY_SIGNAL`|нет. По умолчанию: **SIGTERM** | Тип сигнала завершения приложения | При получении данного сигнала будет запущен процесс плавного завершения приложения. |

### Пример использования

Регистрация модуля (глобальный, регистрируется через `forRoot()` в корневом модуле приложения):

```ts
import { Module } from '@nestjs/common';
import { GracefulShutdownModule } from 'src/modules/graceful-shutdown';

@Module({
  imports: [GracefulShutdownModule.forRoot()],
})
export class MainModule {}
```

### Опции `forRoot()`

`GracefulShutdownModule.forRoot()` **не принимает аргументов**. Все настройки поведения задаются через переменные окружения (см. раздел [Параметры окружения](#параметры-окружения)).

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| — | — | — | — | Метод `forRoot()` вызывается без параметров. Поведение фаз `BEFORE_DESTROY` / `DESTROY` / `AFTER_DESTROY` / Grace Period и используемый сигнал задаются env-переменными `GRACEFUL_SHUTDOWN_*`. |

Активация shutdown-хуков NestJS в `main.ts`:

```ts
const app = await NestFactory.create(MainModule);

app.enableShutdownHooks();

await app.listen(port);
```

Консьюмер, использующий счетчик активных процессов и обработчик события закрытия:

```ts
import { Injectable } from '@nestjs/common';
import {
  GracefulShutdownOnCount,
  GracefulShutdownOnEvent,
  GracefulShutdownEvents,
} from 'src/modules/graceful-shutdown';

@Injectable()
export class OrderConsumer {
  @GracefulShutdownOnEvent({ event: GracefulShutdownEvents.BEFORE_DESTROY })
  public async stopConsuming(): Promise<void> {
    // Прекращаем приём новых сообщений — все текущие обработки должны
    // доиграть в фазе DESTROY за счёт счётчика @GracefulShutdownOnCount.
  }

  @GracefulShutdownOnCount()
  public async handleMessage(payload: unknown): Promise<void> {
    // Счётчик ACTIVE_METHODS_GAUGE инкрементируется на входе,
    // декрементируется при завершении (как успешном, так и с ошибкой).
  }

  @GracefulShutdownOnEvent({ event: GracefulShutdownEvents.AFTER_DESTROY })
  public async cleanup(): Promise<void> {
    // Закрываем соединения, сбрасываем буферы и т.п.
  }
}
```

### Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`UNCAUGHT_EXCEPTION_COUNT`|**labelNames** `['type', 'module', 'file']`| Счетчик количества не обработанных ошибок|
|`UNCAUGHT_REJECTION_COUNT`|**labelNames** `['reason', 'type', 'module', 'file']`| Счетчик количества не обработанных Promise rejections|
|`GRACEFUL_SHUTDOWN_DURATIONS`|**labelNames** `['service', 'signal']`| Гистограмма длительности плавного завершения приложения|
|`GRACEFUL_SHUTDOWN_FAILED`|**labelNames** `['service', 'signal']`| Количество не удачных завершений работы приложения|
|`ACTIVE_METHODS_GAUGE`|**labelNames** `['service', 'method']`| Счетчик количества активных процессов|
|`ACTIVE_METHODS_DURATIONS`|**labelNames** `['service', 'method']`| Гистограмма длительности выполнения активных процессов|
|`ACTIVE_METHODS_FAILED`|**labelNames** `['service', 'method']`| Количество активных процессов завершенных с ошибкой |
